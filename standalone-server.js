/**
 * standalone-server.js — Dashboard Server for Infinity Free
 * 
 * This is a lightweight Express server that serves the dashboard HTML.
 * It does NOT require Discord.js or bot code — it communicates with
 * the bot via bot-api.js (running on a VPS/other host).
 * 
 * Deploy THIS file on Infinity Free.
 * 
 * Environment variables (set in Infinity Free cPanel):
 *   BOT_API_URL = https://your-bot-host.com:3001
 *   BOT_API_KEY = bot-api-secret-key-change-me
 *   PORT = 3000 (or whatever Infinity Free gives you)
 *   DASHBOARD_SECRET = some-random-secret
 */

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy: DiscordStrategy } = require('passport-discord');
const path = require('path');
require('dotenv').config();

const API_CLIENT = require('./api-client');
const BOT_API_URL = (process.env.BOT_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const BOT_API_KEY = process.env.BOT_API_KEY || 'bot-api-secret-key-change-me';
const ADMINISTRATOR = 0x8n;

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({
  secret: process.env.DASHBOARD_SECRET || 'standalone-dashboard-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 * 7 },
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: `${process.env.DASHBOARD_URL || ''}/auth/discord/callback`,
    scope: ['identify', 'guilds'],
  }, (accessToken, refreshToken, profile, done) => {
    done(null, { id: profile.id, username: profile.username, avatar: profile.avatar, accessToken });
  }));
} else {
  console.warn('Discord OAuth2 env vars are missing. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET before using /auth/discord.');
}

app.use('/public', express.static(path.join(__dirname, 'public')));

// ─── Auth Middleware ─────────────────────────────────────────────────────────
async function requireLogin(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect('/auth/discord');
  next();
}

function dashboardHtml() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Dashboard</title><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/><style>
:root{--bg:#1a1a2e;--card:#16213e;--accent:#7289da;--text:#f5f6fa;--muted:#a0a3bd;--green:#57f287;--red:#ed4245;--yellow:#fee75c}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,Segoe UI,sans-serif}.layout{display:grid;grid-template-columns:260px 1fr;min-height:100vh}.sidebar{background:#111827;padding:22px;position:sticky;top:0;height:100vh;overflow-y:auto}.sidebar h2{color:var(--accent)}.nav a{display:block;padding:12px;border-radius:10px;color:var(--muted);text-decoration:none;margin:4px 0;font-size:14px}.nav a:hover,.nav a.active{background:var(--accent);color:white}.main{padding:24px}.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.section{display:none;background:var(--card);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px;margin-bottom:18px}.section.active{display:block}.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.stat{background:rgba(255,255,255,.04);border-radius:12px;padding:16px}.stat b{font-size:28px;color:var(--accent)}label{display:block;color:var(--muted);margin:12px 0 6px;font-size:13px}input,select,textarea{width:100%;background:#0f172a;border:1px solid #2b355f;color:var(--text);border-radius:10px;padding:10px;margin-bottom:6px}input:focus,select:focus,textarea:focus{outline:2px solid var(--accent)}textarea{resize:vertical;min-height:60px}hr{border:none;border-top:1px solid #2b355f;margin:20px 0}.btn{background:var(--accent);color:white;border:0;border-radius:10px;padding:10px 14px;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:6px;transition:filter .2s;font-size:13px}.btn:hover{filter:brightness(1.15)}.btn.green{background:var(--green);color:#000}.btn.red{background:var(--red)}.btn.yellow{background:var(--yellow);color:#000}.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}.toast{position:fixed;right:20px;bottom:20px;background:#111827;border-left:4px solid var(--green);padding:14px 18px;border-radius:10px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.4);max-width:400px}.toast.error{border-color:var(--red)}.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:9998}.modal-content{background:var(--card);border-radius:16px;padding:24px;max-width:500px;width:90%}.modal-actions{display:flex;gap:12px;margin-top:16px;justify-content:flex-end}.card-item{background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:14px;margin:8px 0}@media(max-width:850px){.layout{grid-template-columns:1fr}.sidebar{position:static;height:auto;max-height:300px}.nav{display:flex;overflow-x:auto;flex-wrap:nowrap}.nav a{white-space:nowrap;font-size:13px;padding:8px}.row{grid-template-columns:1fr}}</style></head><body><div class="layout"><aside class="sidebar"><h2><i class="fa-solid fa-ticket"></i> The Boys System</h2><p style="color:var(--muted);font-size:13px">Dashboard</p><nav class="nav"><a class="active" href="#overview" data-section="overview"><i class="fa-solid fa-chart-line"></i> Overview</a><a href="#general" data-section="general"><i class="fa-solid fa-sliders"></i> General</a><a href="#welcome" data-section="welcome"><i class="fa-solid fa-hand-sparkles"></i> Welcome/Leave</a><a href="#autorole" data-section="autorole"><i class="fa-solid fa-user-tag"></i> Auto-Role</a><a href="#logging" data-section="logging"><i class="fa-solid fa-clipboard-list"></i> Logging</a><a href="#security" data-section="security"><i class="fa-solid fa-shield-halved"></i> Security</a><a href="#giveaways" data-section="giveaways"><i class="fa-solid fa-gift"></i> Giveaways</a><a href="#polls" data-section="polls"><i class="fa-solid fa-square-poll-vertical"></i> Polls</a><a href="#verification" data-section="verification"><i class="fa-solid fa-circle-check"></i> Verification</a><a href="#levels" data-section="levels"><i class="fa-solid fa-star"></i> Levels</a><a href="#backup" data-section="backup"><i class="fa-solid fa-database"></i> Backup</a><a href="#botsettings" data-section="botsettings"><i class="fa-solid fa-robot"></i> Bot Settings</a><a href="#keywords" data-section="keywords"><i class="fa-solid fa-keyboard"></i> Keywords</a><a href="#messages" data-section="messages"><i class="fa-solid fa-message"></i> Messages</a><a href="#servercontrol" data-section="servercontrol"><i class="fa-solid fa-server"></i> Server Control</a><a href="#starboard" data-section="starboard"><i class="fa-solid fa-star"></i> Starboard</a><a href="#afk" data-section="afk"><i class="fa-solid fa-bed"></i> AFK</a><a href="#invites" data-section="invites"><i class="fa-solid fa-user-plus"></i> Invites</a></nav></aside><main class="main"><div class="topbar"><h1 style="font-size:22px">Dashboard</h1><button class="btn green" id="saveBtn"><i class="fa-solid fa-floppy-disk"></i> Save Settings</button></div>

<div id="overview" class="section active"><div class="grid2"><div class="stat"><b id="members">—</b><p>Members</p></div><div class="stat"><b id="channels">—</b><p>Channels</p></div><div class="stat"><b id="roles">—</b><p>Roles</p></div></div><div id="botStatusDisplay" style="margin-top:12px;color:var(--muted)"></div></div>

<div id="general" class="section"><h2>General Settings</h2><div class="row"><div><label>Brand Color (hex)</label><input id="brandColor" placeholder="5865f2"></div><div><label>Invite Log Channel</label><select id="inviteLogChannel"></select></div></div></div>

<div id="welcome" class="section"><h2>Welcome / Leave</h2><div class="row"><div><label>Welcome Channel</label><select id="welcomeChannel"></select><textarea id="welcomeMessage" rows="3"></textarea></div><div><label>Leave Channel</label><select id="leaveChannel"></select><textarea id="leaveMessage" rows="3"></textarea></div></div><label><input type="checkbox" id="welcomeEnabled"> Enabled</label></div>

<div id="autorole" class="section"><h2>Auto-Role</h2><label><input type="checkbox" id="autoroleEnabled"> Enabled</label><label>Roles</label><select id="autoroleRoles" multiple></select></div>

<div id="logging" class="section"><h2>Logging Channels</h2><div id="logChannels"></div></div>

<div id="security" class="section"><h2>Anti-Spam / Anti-Raid</h2><div class="row"><div><h3>Anti-Spam</h3><label><input type="checkbox" id="antiSpamEnabled"> Enabled</label><label>Threshold</label><input id="antiSpamThreshold" type="number"><label>Window (sec)</label><input id="antiSpamWindow" type="number"><label>Timeout (sec)</label><input id="antiSpamTimeout" type="number"></div><div><h3>Anti-Raid</h3><label><input type="checkbox" id="antiRaidEnabled"> Enabled</label><label>Threshold</label><input id="antiRaidThreshold" type="number"><label>Window (sec)</label><input id="antiRaidWindow" type="number"><label>Lockdown (min)</label><input id="antiRaidLockdown" type="number"></div></div></div>

<div id="giveaways" class="section"><h2>Giveaways</h2><div class="row"><div><label>Channel</label><select id="gwChannel"></select><label>Prize</label><input id="gwPrize"><label>Winners</label><input id="gwWinners" type="number" value="1"><label>Duration</label><input id="gwDuration" placeholder="1h, 30m, 2d"><button class="btn green" onclick="createGW()">Start Giveaway</button></div><div><div id="giveawaysList"></div></div></div></div>

<div id="polls" class="section"><h2>Polls</h2><div class="row"><div><label>Channel</label><select id="pollChannel"></select><label>Question</label><input id="pollQuestion"><label>Options (one per line)</label><textarea id="pollOptions" rows="4"></textarea><label>Duration (optional)</label><input id="pollDuration" placeholder="1h"><button class="btn green" onclick="createPoll()">Create Poll</button></div><div><div id="pollsList"></div></div></div></div>

<div id="verification" class="section"><h2>Verification</h2><div class="row"><div><label><input type="checkbox" id="verificationEnabled"> Enabled</label><label>Type</label><select id="verificationType"><option value="both">Both</option><option value="reaction">Reaction</option><option value="button">Button</option></select><label>Button Label</label><input id="verificationButtonLabel" value="Verify"><label>Emoji</label><input id="verificationEmoji" value="✅"><label>Unverified Role</label><select id="unverifiedRole"></select><label>Verified Role</label><select id="verifiedRole"></select></div><div><label>Message Text</label><textarea id="verificationMessageText" rows="3"></textarea><label>Image URL</label><input id="verificationImageUrl"><button class="btn" onclick="saveVerification()">Save</button><button class="btn green" onclick="resendVerification()" style="margin-top:8px">Resend Message</button></div></div></div>

<div id="levels" class="section"><h2>Levels / XP</h2><div class="row"><div><label><input type="checkbox" id="levelsEnabled"> Enabled</label><label>XP Per Message</label><input id="xpPerMessage" type="number" value="18"><label>Cooldown (sec)</label><input id="xpCooldown" type="number" value="45"><label>Level-Up Channel</label><select id="levelChannel"></select></div><div><h3>Leaderboard</h3><div id="levelsLeaderboard"></div></div></div></div>

<div id="backup" class="section"><h2>Backup</h2><div><button class="btn green" id="createBackup">Create Backup</button><div id="backupsList"></div></div></div>

<div id="botsettings" class="section"><h2>Bot Settings</h2><label>Status</label><select id="botStatus"><option>online</option><option>idle</option><option>dnd</option><option>invisible</option></select><label>Presence Type</label><select id="presenceType"><option>PLAYING</option><option>WATCHING</option><option>LISTENING</option><option>COMPETING</option></select><label>Presence Text</label><input id="presenceText"><label>Avatar URL</label><input id="botAvatar"><button class="btn green" onclick="saveBot()">Save Bot Settings</button></div>

<div id="keywords" class="section"><h2>Keywords</h2><label>Command ID</label><input id="kwId"><label>Keywords (comma)</label><input id="kwKeywords"><label>Response</label><textarea id="kwResponse" rows="3"></textarea><button class="btn green" onclick="saveKeyword()">Save</button><div id="keywordsList"></div></div>

<div id="messages" class="section"><h2>Messages</h2><label>Channel</label><select id="msgChannelSelect"></select><label>Content</label><textarea id="msgContent" rows="4"></textarea><button class="btn" onclick="sendMessage()">Send</button><hr><label>Channel ID</label><input id="editChannelId"><label>Message ID</label><input id="editMsgId"><label>New Content</label><textarea id="editContent" rows="3"></textarea><button class="btn" onclick="editMessage()">Edit</button><button class="btn red" onclick="deleteMessage()">Delete</button></div>

<div id="servercontrol" class="section"><h2>Server Control</h2><label>Server Name</label><input id="serverName"><button class="btn" onclick="setServerName()">Set</button><label>Channel Name</label><input id="newChannelName"><button class="btn" onclick="createChannel()">Create Channel</button><label>Role Name</label><input id="newRoleName"><button class="btn" onclick="createRole()">Create Role</button></div>

<div id="starboard" class="section"><h2>Starboard</h2><label><input type="checkbox" id="starEnabled"> Enabled</label><label>Channel</label><select id="starChannel"></select><label>Emoji</label><input id="starEmoji" value="⭐"><label>Threshold</label><input id="starThreshold" type="number"><label>Min Length</label><input id="starMin" type="number"><button class="btn green" onclick="saveStar()">Save</button></div>

<div id="afk" class="section"><h2>AFK</h2><label><input type="checkbox" id="afkEnabled"> Enabled</label><label>Message Format</label><input id="afkMessage"><label>Nickname Format</label><input id="afkNick"><button class="btn green" onclick="saveAfk()">Save</button></div>

<div id="invites" class="section"><h2>Invites</h2><pre id="inviteLeaderboard"></pre></div>

</main></div>

<div id="confirmModal" class="modal" style="display:none"><div class="modal-content"><h3 id="modalTitle">Confirm</h3><p id="modalText">Are you sure?</p><div class="modal-actions"><button class="btn" id="modalCancel">Cancel</button><button class="btn red" id="modalConfirm">Confirm</button></div></div></div>

<script>
const guildId='REPLACE_WITH_GUILD_ID';let SETTINGS={},CHANNELS=[],ROLES=[];
const $=id=>document.getElementById(id);
function showModal(title,text,cb){$('modalTitle').textContent=title;$('modalText').textContent=text;$('confirmModal').style.display='flex';$('modalConfirm').onclick=()=>{$('confirmModal').style.display='none';cb();};$('modalCancel').onclick=()=>$('confirmModal').style.display='none';}
function opt(id,value,label){const o=document.createElement('option');o.value=value;o.textContent=label;$(id).appendChild(o);}
function bool(id){return $(id).checked;}
function val(id){const el=$(id);return el.multiple?[...el.selectedOptions].map(o=>o.value):el.value;}
function toast(msg,type){const e=document.createElement('div');e.className='toast'+(type==='error'?' error':'');e.innerHTML=msg;document.body.appendChild(e);setTimeout(()=>e.remove(),4000);}

const API_BASE='REPLACE_WITH_BOT_API_URL';
const API_KEY='REPLACE_WITH_BOT_API_KEY';
async function api(path,method='GET',body){const r=await fetch(API_BASE+'/api/v1'+path,{method,headers:{'Content-Type':'application/json','x-api-key':API_KEY},body:body?JSON.stringify(body):null});if(!r.ok)throw new Error(await r.text());return r.json();}

async function load(){
  [SETTINGS,CHANNELS,ROLES]=await Promise.all([api('/guilds/'+guildId+'/settings'),api('/guilds/'+guildId+'/channels'),api('/guilds/'+guildId+'/roles')]);
  $('brandColor').value=SETTINGS.brandColor?.toString(16)||'5865f2';
  ['welcomeChannel','leaveChannel','levelChannel','msgChannelSelect','gwChannel','pollChannel','starChannel','inviteLogChannel'].forEach(id=>{$(id).innerHTML='<option value="">—</option>'});
  CHANNELS.filter(c=>c.type===0).forEach(c=>{['welcomeChannel','leaveChannel','levelChannel','msgChannelSelect','gwChannel','pollChannel','starChannel','inviteLogChannel'].forEach(id=>opt(id,c.id,c.name))});
  ['unverifiedRole','verifiedRole','autoroleRoles'].forEach(id=>{$(id).innerHTML=''});
  ROLES.forEach(r=>{opt('unverifiedRole',r.id,r.name);opt('verifiedRole',r.id,r.name);opt('autoroleRoles',r.id,r.name)});
  $('welcomeChannel').value=SETTINGS.welcome?.channel||'';$('leaveChannel').value=SETTINGS.welcome?.leaveChannel||'';
  $('welcomeMessage').value=SETTINGS.welcome?.message||'';$('leaveMessage').value=SETTINGS.welcome?.leaveMessage||'';
  $('welcomeEnabled').checked=!!SETTINGS.welcome?.enabled;$('autoroleEnabled').checked=!!SETTINGS.autorole?.enabled;
  [...$('autoroleRoles').options].forEach(o=>o.selected=(SETTINGS.autorole?.roles||[]).includes(o.value));
  $('antiSpamEnabled').checked=!!SETTINGS.antiSpam?.enabled;$('antiSpamThreshold').value=SETTINGS.antiSpam?.threshold||5;
  $('antiSpamWindow').value=SETTINGS.antiSpam?.windowSeconds||3;$('antiSpamTimeout').value=SETTINGS.antiSpam?.timeoutSeconds||60;
  $('antiRaidEnabled').checked=!!SETTINGS.antiRaid?.enabled;$('antiRaidThreshold').value=SETTINGS.antiRaid?.threshold||10;
  $('antiRaidWindow').value=SETTINGS.antiRaid?.windowSeconds||30;$('antiRaidLockdown').value=SETTINGS.antiRaid?.lockdownMinutes||10;
  $('verificationEnabled').checked=!!SETTINGS.verification?.enabled;$('verificationType').value=SETTINGS.verification?.type||'both';
  $('verificationButtonLabel').value=SETTINGS.verification?.buttonLabel||'Verify';$('verificationEmoji').value=SETTINGS.verification?.emoji||'✅';
  $('verificationMessageText').value=SETTINGS.verification?.messageText||'';$('verificationImageUrl').value=SETTINGS.verification?.imageUrl||'';
  $('unverifiedRole').value=SETTINGS.verification?.unverifiedRoleId||'';$('verifiedRole').value=SETTINGS.verification?.verifiedRoleId||'';
  $('levelsEnabled').checked=!!SETTINGS.levels?.enabled;$('xpPerMessage').value=SETTINGS.levels?.xpPerMessage||18;
  $('xpCooldown').value=SETTINGS.levels?.cooldownSeconds||45;$('levelChannel').value=SETTINGS.levelUpChannelId||'';
  $('starEnabled').checked=!!SETTINGS.starboard?.enabled;$('starEmoji').value=SETTINGS.starboard?.emoji||'⭐';
  $('starThreshold').value=SETTINGS.starboard?.threshold||3;$('starMin').value=SETTINGS.starboard?.minLength||5;
  $('starChannel').value=SETTINGS.starboard?.channelId||'';
  $('afkEnabled').checked=!!SETTINGS.afk?.enabled;$('afkMessage').value=SETTINGS.afk?.messageFormat||'';
  $('afkNick').value=SETTINGS.afk?.nicknameFormat||'';$('inviteLogChannel').value=SETTINGS.inviteLogChannelId||'';
  const logTypes=['moderation','messages','members','channels','roles','voice','server'];
  $('logChannels').innerHTML=logTypes.map(t=>'<label>'+t.charAt(0).toUpperCase()+t.slice(1)+'</label><select id="log-'+t+'"><option value="">—</option>'+CHANNELS.filter(c=>c.type===0).map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select>').join('');
  logTypes.forEach(t=>$(t!=='server'?'log-'+t:'log-server').value=SETTINGS.logs?.[t]||'');
  const info=await api('/guilds/'+guildId+'/info');
  $('members').textContent=info.memberCount||0;$('channels').textContent=info.channels||0;$('roles').textContent=info.roles||0;
  try{const bs=await api('/status');$('botStatusDisplay').innerHTML='Bot: <b>'+bs.username+'</b> | Servers: '+bs.servers+' | Uptime: '+bs.uptime+'s';}catch(e){}
  try{const gws=await api('/guilds/'+guildId+'/giveaways');$('giveawaysList').innerHTML=gws.length?gws.map(g=>'<div class="card-item"><b>'+g.prize+'</b><br><button class="btn yellow" onclick="endGW(\\''+g.messageId+'\\')">End</button> <button class="btn" onclick="rerollGW(\\''+g.messageId+'\\')">Reroll</button> <button class="btn red" onclick="deleteGW(\\''+g.messageId+'\\')">Cancel</button></div>').join(''):'<p style="color:var(--muted)">None</p>';}catch(e){}
  try{const polls=await api('/guilds/'+guildId+'/polls');$('pollsList').innerHTML=Object.keys(polls).length?Object.entries(polls).map(([id,p])=>'<div class="card-item"><b>'+p.question+'</b><br><button class="btn red" onclick="deletePoll(\\''+id+'\\')">Delete</button></div>').join(''):'<p style="color:var(--muted)">None</p>';}catch(e){}
  try{const bks=await api('/guilds/'+guildId+'/backups');$('backupsList').innerHTML=bks.length?bks.map(b=>'<div class="card-item"><b>'+b.name+'</b><br><button class="btn red" onclick="deleteBackup(\\''+b.id+'\\')">Delete</button></div>').join(''):'<p style="color:var(--muted)">None</p>';}catch(e){}
  try{const kws=await api('/guilds/'+guildId+'/keywords');$('keywordsList').innerHTML=kws.length?kws.map(k=>'<div class="card-item"><b>'+(k.command||k.id)+'</b></div>').join(''):'<p style="color:var(--muted)">None</p>';}catch(e){}
  try{const lb=await api('/guilds/'+guildId+'/levels/leaderboard');$('levelsLeaderboard').innerHTML=lb.length?lb.map(u=>'<div class="card-item"><b>'+u.userId+'</b> Lv.'+u.level+' XP:'+u.xp+'</div>').join(''):'<p style="color:var(--muted)">None</p>';}catch(e){}
  try{const inv=await api('/guilds/'+guildId+'/invites/leaderboard');$('inviteLeaderboard').textContent=JSON.stringify(inv,null,2);}catch(e){}
  try{const rr=await api('/guilds/'+guildId+'/reaction-roles');console.log('Reaction roles:',rr);}catch(e){}
}

function collect(){const logs={};['moderation','messages','members','channels','roles','voice','server'].forEach(t=>logs[t]=$('log-'+t)?.value||'');return{
  brandColor:parseInt($('brandColor').value.replace('#',''),16)||0x5865f2,
  inviteLogChannelId:$('inviteLogChannel').value||null,
  welcome:{enabled:bool('welcomeEnabled'),channel:$('welcomeChannel').value,leaveChannel:$('leaveChannel').value,message:$('welcomeMessage').value,leaveMessage:$('leaveMessage').value},
  autorole:{enabled:bool('autoroleEnabled'),roles:val('autoroleRoles')},
  antiSpam:{enabled:bool('antiSpamEnabled'),threshold:Number($('antiSpamThreshold').value),windowSeconds:Number($('antiSpamWindow').value),timeoutSeconds:Number($('antiSpamTimeout').value)},
  antiRaid:{enabled:bool('antiRaidEnabled'),threshold:Number($('antiRaidThreshold').value),windowSeconds:Number($('antiRaidWindow').value),lockdownMinutes:Number($('antiRaidLockdown').value)},
  verification:{enabled:bool('verificationEnabled'),type:$('verificationType').value,buttonLabel:$('verificationButtonLabel').value,emoji:$('verificationEmoji').value,messageText:$('verificationMessageText').value,imageUrl:$('verificationImageUrl').value,unverifiedRoleId:$('unverifiedRole').value,verifiedRoleId:$('verifiedRole').value},
  levelUpChannelId:$('levelChannel').value,levels:{enabled:bool('levelsEnabled'),xpPerMessage:Number($('xpPerMessage').value),cooldownSeconds:Number($('xpCooldown').value)},
  starboard:{enabled:bool('starEnabled'),channelId:$('starChannel').value,emoji:$('starEmoji').value,threshold:Number($('starThreshold').value),minLength:Number($('starMin').value)},
  afk:{enabled:bool('afkEnabled'),messageFormat:$('afkMessage').value,nicknameFormat:$('afkNick').value},
  logs
};}

async function save(){try{await api('/guilds/'+guildId+'/settings','POST',collect());toast('✅ Saved');}catch(e){toast('❌ '+e.message,'error')}}
async function saveBot(){try{await api('/bot/status','POST',{status:$('botStatus').value,presenceType:$('presenceType').value,presenceText:$('presenceText').value,avatar:$('botAvatar').value});toast('✅ Saved');}catch(e){toast('❌ '+e.message,'error')}}
async function saveKeyword(){try{await api('/guilds/'+guildId+'/keywords','POST',{id:$('kwId').value,keywords:$('kwKeywords').value.split(',').map(s=>s.trim()).filter(Boolean),response:$('kwResponse').value});toast('✅ Saved');load();}catch(e){toast('❌ '+e.message,'error')}}
async function sendMessage(){try{const m=await api('/guilds/'+guildId+'/messages/send','POST',{channelId:$('msgChannelSelect').value,content:$('msgContent').value});toast('✅ Sent');}catch(e){toast('❌ '+e.message,'error')}}
async function editMessage(){try{await api('/guilds/'+guildId+'/messages/'+$('editMsgId').value,'PUT',{channelId:$('editChannelId').value,content:$('editContent').value});toast('✅ Edited');}catch(e){toast('❌ '+e.message,'error')}}
async function deleteMessage(){showModal('Delete','Delete?',async()=>{try{await api('/guilds/'+guildId+'/messages/'+$('editMsgId').value,'DELETE',{channelId:$('editChannelId').value});toast('✅ Deleted');}catch(e){toast('❌ '+e.message,'error')}});}
async function setServerName(){try{await api('/guilds/'+guildId+'/server/name','POST',{name:$('serverName').value});toast('✅ Done');}catch(e){toast('❌ '+e.message,'error')}}
async function createChannel(){try{await api('/guilds/'+guildId+'/server/channels','POST',{name:$('newChannelName').value});toast('✅ Created');}catch(e){toast('❌ '+e.message,'error')}}
async function createRole(){try{await api('/guilds/'+guildId+'/server/roles','POST',{name:$('newRoleName').value});toast('✅ Created');}catch(e){toast('❌ '+e.message,'error')}}
async function saveVerification(){try{await api('/guilds/'+guildId+'/settings','POST',collect());toast('✅ Saved');}catch(e){toast('❌ '+e.message,'error')}}
async function resendVerification(){showModal('Resend','Send new verification message?',async()=>{try{await api('/guilds/'+guildId+'/verification/send','POST');toast('✅ Sent!');}catch(e){toast('❌ '+e.message,'error')}});}
async function saveStar(){try{await api('/guilds/'+guildId+'/settings','POST',collect());toast('✅ Saved');}catch(e){toast('❌ '+e.message,'error')}}
async function saveAfk(){try{await api('/guilds/'+guildId+'/settings','POST',collect());toast('✅ Saved');}catch(e){toast('❌ '+e.message,'error')}}
async function createGW(){try{await api('/guilds/'+guildId+'/giveaways','POST',{channelId:$('gwChannel').value,prize:$('gwPrize').value,winners:Number($('gwWinners').value),duration:$('gwDuration').value});toast('✅ Created');load();}catch(e){toast('❌ '+e.message,'error')}}
async function endGW(id){try{await api('/guilds/'+guildId+'/giveaways/'+id+'/end','POST');toast('✅ Ended');load();}catch(e){toast('❌ '+e.message,'error')}}
async function rerollGW(id){try{await api('/guilds/'+guildId+'/giveaways/'+id+'/reroll','POST');toast('✅ Rerolled');}catch(e){toast('❌ '+e.message,'error')}}
async function deleteGW(id){showModal('Cancel','Cancel?',async()=>{try{await api('/guilds/'+guildId+'/giveaways/'+id,'DELETE');toast('✅ Cancelled');load();}catch(e){toast('❌ '+e.message,'error')}});}
async function createPoll(){try{const opts=$('pollOptions').value.split('\\n').filter(Boolean);await api('/guilds/'+guildId+'/polls','POST',{channelId:$('pollChannel').value,question:$('pollQuestion').value,options:opts,duration:$('pollDuration').value||null});toast('✅ Created');load();}catch(e){toast('❌ '+e.message,'error')}}
async function deletePoll(id){showModal('Delete','Delete?',async()=>{try{await api('/guilds/'+guildId+'/polls/'+id,'DELETE');toast('✅ Deleted');load();}catch(e){toast('❌ '+e.message,'error')}});}
async function deleteBackup(id){showModal('Delete','Delete backup?',async()=>{try{await api('/guilds/'+guildId+'/backups/'+id,'DELETE');toast('✅ Deleted');load();}catch(e){toast('❌ '+e.message,'error')}});}

document.querySelectorAll('.nav a[data-section]').forEach(a=>a.onclick=e=>{e.preventDefault();document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));document.querySelectorAll('.nav a[data-section]').forEach(n=>n.classList.remove('active'));$(a.dataset.section).classList.add('active');a.classList.add('active')});
$('saveBtn').onclick=save;$('createBackup').onclick=async()=>{try{await api('/guilds/'+guildId+'/backups','POST',{name:'dashboard'});toast('✅ Created');load();}catch(e){toast('❌ '+e.message,'error')}};
load();
</script></body></html>`;
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>The Boys System</title><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/><style>
body{margin:0;background:#1a1a2e;color:#f5f6fa;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}.card{background:#16213e;padding:32px;border-radius:20px;text-align:center;max-width:500px}.btn{display:inline-block;background:#7289da;color:white;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:700;margin:12px 4px}</style></head><body><div class="card"><h1>🎫 The Boys System</h1><p>Bot Management Dashboard</p><a class="btn" href="/auth/discord"><i class="fa-brands fa-discord"></i> Login with Discord</a><a class="btn" href="/dashboard" style="background:#57f287;color:#000">Dashboard</a></div></body></html>`);
});

app.get('/auth/discord', (req, res, next) => {
  if (!passport._strategies.discord) return res.status(500).send('Discord OAuth2 is not configured');
  passport.authenticate('discord')(req, res, next);
});
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));
app.get('/auth/logout', (req, res, next) => { req.logout(err => err ? next(err) : res.redirect('/')); });

app.get('/dashboard', requireLogin, async (req, res) => {
  try {
    const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${req.user.accessToken}` },
    });
    const guilds = await guildsRes.json();
    const adminGuilds = guilds.filter(g => (BigInt(g.permissions || 0) & ADMINISTRATOR) === ADMINISTRATOR);
    
    if (adminGuilds.length === 0) return res.send('<h1>No admin guilds found</h1><a href="/auth/logout">Logout</a>');
    if (adminGuilds.length === 1) return res.redirect(`/dashboard/${adminGuilds[0].id}`);
    
    const cards = adminGuilds.map(g => `<div style="background:#16213e;padding:16px;border-radius:12px;margin:8px"><h3>${g.name}</h3><a class="btn" href="/dashboard/${g.id}">Manage</a></div>`).join('');
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Select Guild</title><style>body{background:#1a1a2e;color:#f5f6fa;font-family:Inter,sans-serif;padding:32px}.btn{background:#7289da;color:white;padding:10px 18px;border-radius:10px;text-decoration:none;display:inline-block}</style></head><body><h1>Select a Server</h1>${cards}</body></html>`);
  } catch (err) {
    res.status(500).send(`<pre>${err.message}</pre>`);
  }
});

app.get('/dashboard/:guildId', requireLogin, (req, res) => {
  let html = dashboardHtml();
  html = html.replace('REPLACE_WITH_GUILD_ID', req.params.guildId);
  html = html.replace('REPLACE_WITH_BOT_API_URL', process.env.BOT_API_URL || 'http://localhost:3001');
  html = html.replace('REPLACE_WITH_BOT_API_KEY', process.env.BOT_API_KEY || 'bot-api-secret-key-change-me');
  res.send(html);
});

async function proxyToBot(req, res, path, method = 'GET', body) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': BOT_API_KEY,
    };
    const options = { method, headers };
    if (body !== undefined) options.body = JSON.stringify(body);
    const upstream = await fetch(`${BOT_API_URL}/api/v1${path}`, options);
    const text = await upstream.text();
    let payload;
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
    if (!upstream.ok) return res.status(upstream.status).json(payload);
    return res.json(payload);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}

function guildIdFromRequest(req, extra = {}) {
  const guildId = req.body?.guildId || req.query.guildId || req.params.guildId;
  const { guildId: _guildId, ...body } = req.body || {};
  return { guildId, body: { ...body, ...extra } };
}

app.get('/api/session', requireLogin, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, avatar: req.user.avatar });
});

app.get('/api/status', requireLogin, (req, res) => proxyToBot(req, res, '/status'));

app.get('/api/settings', requireLogin, (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/settings`);
});

app.post('/api/settings', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/settings`, 'POST', body);
});

app.get('/api/keywords', requireLogin, (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/keywords`);
});

app.post('/api/keywords', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/keywords`, 'POST', body);
});

app.put('/api/keywords/:keyword', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/keywords/${encodeURIComponent(req.params.keyword)}`, 'PUT', body);
});

app.delete('/api/keywords/:keyword', requireLogin, (req, res) => {
  const guildId = req.query.guildId || req.body?.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/keywords/${encodeURIComponent(req.params.keyword)}`, 'DELETE', { guildId });
});

app.post('/api/messages/send', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/messages/send`, 'POST', body);
});

app.put('/api/messages/:id', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/messages/${encodeURIComponent(req.params.id)}`, 'PUT', body);
});

app.delete('/api/messages/:id', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/messages/${encodeURIComponent(req.params.id)}`, 'DELETE', body);
});

app.post('/api/server/name', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/server/name`, 'POST', body);
});

app.post('/api/server/icon', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/server/icon`, 'POST', body);
});

app.post('/api/server/description', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/server/description`, 'POST', body);
});

app.post('/api/server/channels', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/server/channels`, 'POST', body);
});

app.delete('/api/server/channels/:id', requireLogin, (req, res) => {
  const guildId = req.query.guildId || req.body?.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/server/channels/${encodeURIComponent(req.params.id)}`, 'DELETE', { guildId });
});

app.post('/api/server/roles', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/server/roles`, 'POST', body);
});

app.delete('/api/server/roles/:id', requireLogin, (req, res) => {
  const guildId = req.query.guildId || req.body?.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/server/roles/${encodeURIComponent(req.params.id)}`, 'DELETE', { guildId });
});

app.get('/api/verification', requireLogin, (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/verification`);
});

app.post('/api/verification', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/verification`, 'POST', body);
});

app.post('/api/verification/resend', requireLogin, (req, res) => {
  const guildId = req.body?.guildId || req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/verification/send`, 'POST', { guildId });
});

app.get('/api/backups', requireLogin, (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/backups`);
});

app.post('/api/backups', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/backups`, 'POST', body);
});

app.delete('/api/backups/:id', requireLogin, (req, res) => {
  const guildId = req.query.guildId || req.body?.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/backups/${encodeURIComponent(req.params.id)}`, 'DELETE', { guildId });
});

app.post('/api/backups/:id/restore', requireLogin, (req, res) => {
  const guildId = req.body?.guildId || req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/backups/${encodeURIComponent(req.params.id)}/restore`, 'POST', { guildId });
});

app.get('/api/giveaways', requireLogin, (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/giveaways`);
});

app.post('/api/giveaways', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/giveaways`, 'POST', body);
});

app.post('/api/giveaways/:id/end', requireLogin, (req, res) => {
  const guildId = req.body?.guildId || req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/giveaways/${encodeURIComponent(req.params.id)}/end`, 'POST', { guildId });
});

app.post('/api/giveaways/:id/reroll', requireLogin, (req, res) => {
  const guildId = req.body?.guildId || req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/giveaways/${encodeURIComponent(req.params.id)}/reroll`, 'POST', { guildId });
});

app.get('/api/polls', requireLogin, (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/polls`);
});

app.post('/api/polls', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/polls`, 'POST', body);
});

app.get('/api/polls/:id/results', requireLogin, (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/polls/${encodeURIComponent(req.params.id)}/results`);
});

app.get('/api/reaction-roles', requireLogin, (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/reaction-roles`);
});

app.post('/api/reaction-roles', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/reaction-roles`, 'POST', body);
});

app.post('/api/reaction-roles/:id/add', requireLogin, (req, res) => {
  const guildId = req.body?.guildId || req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/reaction-roles/${encodeURIComponent(req.params.id)}/add`, 'POST', { guildId, ...req.body });
});

app.delete('/api/reaction-roles/:id', requireLogin, (req, res) => {
  const guildId = req.query.guildId || req.body?.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/reaction-roles/${encodeURIComponent(req.params.id)}`, 'DELETE', { guildId });
});

app.get('/api/afk', requireLogin, (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/afk`);
});

app.post('/api/afk', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/afk`, 'POST', body);
});

app.get('/api/starboard', requireLogin, (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/starboard`);
});

app.post('/api/starboard', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/starboard`, 'POST', body);
});

app.get('/api/suggestions', requireLogin, (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/suggestions`);
});

app.post('/api/suggestions/config', requireLogin, (req, res) => {
  const { guildId, ...body } = req.body || {};
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/suggestions/config`, 'POST', body);
});

app.post('/api/suggestions/:id/status', requireLogin, (req, res) => {
  const guildId = req.body?.guildId || req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/suggestions/${encodeURIComponent(req.params.id)}/status`, 'POST', { guildId, ...req.body });
});

app.get('/api/levels/leaderboard', requireLogin, (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/levels/leaderboard`);
});

app.get('/api/invites/leaderboard', requireLogin, (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) return res.status(400).json({ error: 'guildId is required' });
  proxyToBot(req, res, `/guilds/${encodeURIComponent(guildId)}/invites/leaderboard`);
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`🌐 Standalone Dashboard running on port ${PORT}`);
  console.log(`🔗 Bot API URL: ${process.env.BOT_API_URL || 'http://localhost:3001'}`);
});