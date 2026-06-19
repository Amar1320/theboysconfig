(function (global) {
  const defaultConfig = {
    base: global.THE_BOYS_API_BASE || '',
    botApiUrl: (global.THE_BOYS_BOT_API_URL || '').replace(/\/$/, ''),
    guildId: global.THE_BOYS_GUILD_ID || localStorage.getItem('theBoysGuildId') || '',
    apiKey: global.THE_BOYS_API_KEY || localStorage.getItem('theBoysApiKey') || '',
    directBotApi: Boolean(global.THE_BOYS_DIRECT_BOT_API),
  };

  class TheBoysApiClient {
    constructor(config = {}) {
      this.config = { ...defaultConfig, ...config };
      if (this.config.guildId) localStorage.setItem('theBoysGuildId', this.config.guildId);
      if (this.config.apiKey) localStorage.setItem('theBoysApiKey', this.config.apiKey);
    }

    configure(config = {}) {
      this.config = { ...this.config, ...config };
      if (this.config.guildId) localStorage.setItem('theBoysGuildId', this.config.guildId);
      if (this.config.apiKey) localStorage.setItem('theBoysApiKey', this.config.apiKey);
      return this;
    }

    setGuildId(guildId) {
      this.config.guildId = guildId;
      localStorage.setItem('theBoysGuildId', guildId);
      return this;
    }

    setApiKey(apiKey) {
      this.config.apiKey = apiKey;
      localStorage.setItem('theBoysApiKey', apiKey);
      return this;
    }

    async request(path, method = 'GET', body = null, options = {}) {
      const direct = options.direct ?? this.config.directBotApi;
      const url = direct ? `${this.config.botApiUrl}/api/v1${path}` : `${this.config.base}${path}`;
      const headers = { 'Content-Type': 'application/json' };
      if ((direct || options.apiKey) && this.config.apiKey) headers['x-api-key'] = this.config.apiKey;

      const response = await fetch(url, {
        method,
        headers,
        body: body === null || body === undefined ? null : JSON.stringify(body),
      });

      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

      if (!response.ok) {
        const message = data?.error || data?.message || text || `Request failed with ${response.status}`;
        throw new Error(message);
      }
      return data;
    }

    login() {
      window.location.assign('/auth/discord');
    }

    async logout() {
      return this.request('/auth/logout', 'GET', null, { auth: false });
    }

    async ensureAuthenticated() {
      try {
        return await this.request('/api/session', 'GET', null, { auth: false });
      } catch {
        this.login();
        return null;
      }
    }

    guildPath(path, guildId = this.config.guildId) {
      return `/guilds/${encodeURIComponent(guildId)}${path}`;
    }

    async getGuildInfo(guildId = this.config.guildId) {
      return this.request(this.guildPath('/info', guildId));
    }

    async getChannels(guildId = this.config.guildId) {
      return this.request(this.guildPath('/channels', guildId));
    }

    async getRoles(guildId = this.config.guildId) {
      return this.request(this.guildPath('/roles', guildId));
    }

    async getSettings(guildId = this.config.guildId) {
      return this.request(this.guildPath('/settings', guildId));
    }

    async updateSettings(guildId = this.config.guildId, data = {}) {
      return this.request(this.guildPath('/settings', guildId), 'POST', data);
    }

    async getCustomKeywords(guildId = this.config.guildId) {
      return this.request(this.guildPath('/keywords', guildId));
    }

    async getKeywords(guildId = this.config.guildId) {
      return this.getCustomKeywords(guildId);
    }

    async addCustomKeyword(guildId = this.config.guildId, keywordOrData, response, permission) {
      const data = typeof keywordOrData === 'object' ? keywordOrData : { keyword: keywordOrData, response, permission };
      return this.request(this.guildPath('/keywords', guildId), 'POST', data);
    }

    async editCustomKeyword(guildId = this.config.guildId, keyword, data = {}) {
      return this.request(`${this.guildPath('/keywords', guildId)}/${encodeURIComponent(keyword)}`, 'PUT', data);
    }

    async deleteCustomKeyword(guildId = this.config.guildId, keyword) {
      return this.request(`${this.guildPath('/keywords', guildId)}/${encodeURIComponent(keyword)}`, 'DELETE');
    }

    async sendMessage(guildId = this.config.guildId, channelId, content, embed) {
      return this.request(this.guildPath('/messages/send', guildId), 'POST', { channelId, content, embed });
    }

    async editMessage(guildId = this.config.guildId, channelId, messageId, newContent) {
      return this.request(`${this.guildPath('/messages', guildId)}/${encodeURIComponent(messageId)}`, 'PUT', { channelId, content: newContent });
    }

    async deleteMessage(guildId = this.config.guildId, channelId, messageId) {
      return this.request(`${this.guildPath('/messages', guildId)}/${encodeURIComponent(messageId)}`, 'DELETE', { channelId });
    }

    async setBotStatus(status, activity, text) {
      return this.request('/bot/status', 'POST', { status, activity, text });
    }

    async setBotName(name) {
      return this.request('/bot/name', 'POST', { name });
    }

    async setBotAvatar(imageUrl) {
      return this.request('/bot/avatar', 'POST', { imageUrl });
    }

    async setServerName(guildId = this.config.guildId, name) {
      return this.request(this.guildPath('/server/name', guildId), 'POST', { name });
    }

    async setServerIcon(guildId = this.config.guildId, imageUrl) {
      return this.request(this.guildPath('/server/icon', guildId), 'POST', { imageUrl });
    }

    async setServerDescription(guildId = this.config.guildId, description) {
      return this.request(this.guildPath('/server/description', guildId), 'POST', { description });
    }

    async createChannel(guildId = this.config.guildId, name, type, parentId) {
      return this.request(this.guildPath('/server/channels', guildId), 'POST', { name, type, parentId });
    }

    async deleteChannel(guildId = this.config.guildId, channelId) {
      return this.request(`${this.guildPath('/server/channels', guildId)}/${encodeURIComponent(channelId)}`, 'DELETE');
    }

    async createRole(guildId = this.config.guildId, name, color, permissions) {
      return this.request(this.guildPath('/server/roles', guildId), 'POST', { name, color, permissions });
    }

    async deleteRole(guildId = this.config.guildId, roleId) {
      return this.request(`${this.guildPath('/server/roles', guildId)}/${encodeURIComponent(roleId)}`, 'DELETE');
    }

    async getVerification(guildId = this.config.guildId) {
      return this.request(this.guildPath('/verification', guildId));
    }

    async updateVerification(guildId = this.config.guildId, data = {}) {
      return this.request(this.guildPath('/verification', guildId), 'POST', data);
    }

    async sendVerificationMessage(guildId = this.config.guildId) {
      return this.request(this.guildPath('/verification/send', guildId), 'POST', {});
    }

    async resendVerificationMessage(guildId = this.config.guildId) {
      return this.sendVerificationMessage(guildId);
    }

    async getBackups(guildId = this.config.guildId) {
      return this.request(this.guildPath('/backups', guildId));
    }

    async createBackup(guildId = this.config.guildId, name) {
      return this.request(this.guildPath('/backups', guildId), 'POST', { name });
    }

    async restoreBackup(guildId = this.config.guildId, backupId) {
      return this.request(`${this.guildPath('/backups', guildId)}/${encodeURIComponent(backupId)}/restore`, 'POST', {});
    }

    async deleteBackup(guildId = this.config.guildId, backupId) {
      return this.request(`${this.guildPath('/backups', guildId)}/${encodeURIComponent(backupId)}`, 'DELETE');
    }

    async getGiveaways(guildId = this.config.guildId) {
      return this.request(this.guildPath('/giveaways', guildId));
    }

    async createGiveaway(guildId = this.config.guildId, channelId, prize, duration, winners, hostRole) {
      return this.request(this.guildPath('/giveaways', guildId), 'POST', { channelId, prize, duration, winners, hostRole });
    }

    async endGiveaway(guildId = this.config.guildId, messageId) {
      return this.request(`${this.guildPath('/giveaways', guildId)}/${encodeURIComponent(messageId)}/end`, 'POST', {});
    }

    async rerollGiveaway(guildId = this.config.guildId, messageId) {
      return this.request(`${this.guildPath('/giveaways', guildId)}/${encodeURIComponent(messageId)}/reroll`, 'POST', {});
    }

    async getPolls(guildId = this.config.guildId) {
      return this.request(this.guildPath('/polls', guildId));
    }

    async createPoll(guildId = this.config.guildId, channelId, question, options, duration) {
      return this.request(this.guildPath('/polls', guildId), 'POST', { channelId, question, options, duration });
    }

    async endPoll(guildId = this.config.guildId, messageId) {
      return this.request(`${this.guildPath('/polls', guildId)}/${encodeURIComponent(messageId)}/end`, 'POST', {});
    }

    async getPollResults(guildId = this.config.guildId, messageId) {
      return this.request(`${this.guildPath('/polls', guildId)}/${encodeURIComponent(messageId)}/results`);
    }

    async getReactionRoles(guildId = this.config.guildId) {
      return this.request(this.guildPath('/reaction-roles', guildId));
    }

    async createReactionRole(guildId = this.config.guildId, channelId, title, description, roles) {
      return this.request(this.guildPath('/reaction-roles', guildId), 'POST', { channelId, title, description, roles });
    }

    async addReactionRole(guildId = this.config.guildId, messageId, emoji, roleId) {
      return this.request(`${this.guildPath('/reaction-roles', guildId)}/${encodeURIComponent(messageId)}/add`, 'POST', { emoji, roleId });
    }

    async removeReactionRole(guildId = this.config.guildId, messageId, emoji) {
      return this.request(`${this.guildPath('/reaction-roles', guildId)}/${encodeURIComponent(messageId)}/${encodeURIComponent(emoji)}`, 'DELETE');
    }

    async deleteReactionRole(guildId = this.config.guildId, messageId) {
      return this.request(`${this.guildPath('/reaction-roles', guildId)}/${encodeURIComponent(messageId)}`, 'DELETE');
    }

    async getAfk(guildId = this.config.guildId) {
      return this.request(this.guildPath('/afk', guildId));
    }

    async updateAfk(guildId = this.config.guildId, data = {}) {
      return this.request(this.guildPath('/afk', guildId), 'POST', data);
    }

    async getStarboard(guildId = this.config.guildId) {
      return this.request(this.guildPath('/starboard', guildId));
    }

    async updateStarboard(guildId = this.config.guildId, data = {}) {
      return this.request(this.guildPath('/starboard', guildId), 'POST', data);
    }

    async getSuggestions(guildId = this.config.guildId) {
      return this.request(this.guildPath('/suggestions', guildId));
    }

    async updateSuggestionsConfig(guildId = this.config.guildId, data = {}) {
      return this.request(this.guildPath('/suggestions/config', guildId), 'POST', data);
    }

    async updateSuggestionStatus(guildId = this.config.guildId, suggestionId, status) {
      return this.request(`${this.guildPath('/suggestions', guildId)}/${encodeURIComponent(suggestionId)}/status`, 'POST', { status });
    }

    async getLevelsLeaderboard(guildId = this.config.guildId, limit = 10) {
      return this.request(`${this.guildPath('/levels/leaderboard', guildId)}?limit=${encodeURIComponent(limit)}`);
    }

    async getInviteLeaderboard(guildId = this.config.guildId) {
      return this.request(this.guildPath('/invites/leaderboard', guildId));
    }

    async getBotStatus() {
      return this.request('/status');
    }
  }

  const client = new TheBoysApiClient();
  global.TheBoysApiClient = TheBoysApiClient;
  global.TheBoysDashboardClient = client;
})(window);
