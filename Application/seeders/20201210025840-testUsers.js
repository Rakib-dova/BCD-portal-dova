'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    return queryInterface.bulkInsert('Users', [
      { userId: '976D46D7-CB0B-48AD-857D-4B42A44EDE13',
        tenantId: '15E2D952-8BA0-42A4-8582-B234CB4A2089',
        userRole: 'A6A3EDCD-00D9-427C-BF03-4EF0112BA16D',
        appVersion: "0.0.1",
        refreshToken: "A13/P0xGAbjSLiK9J0UKkW0NHZ00Mh6vYdG3MUuJM217HsyGEdwQPFllcOyqQpqreowUumW3iZ/LoWyhWmmfR4d8pj6SN+JD8vtlaSJ54uakQm03zv+GEuRuiZ50r0cMWkjhNTUXYMZaLwuo2IG867UqghT9LiHouXiYpbmAfPAEq+pd/CHC7rihMk+x+sP+2+rx3gGV9tBYmkH2RM/FGRjCL5PVMRkDOCg84RuwbBzIjsp6Ue+kNKN+jj2ZzwWomUbtrByIR2MphL4nLo2JcFlWjn1jlXZjXWP/KJ+6biqurMKjsRClEHDtSYxXvqgmSkzSwHHQnp9JK+ODNIQvbnYTuvSVw0MGaOKqkfY7gF4pYGkgDPffQTHgsCBajoHj95kelcHnFuGte5MLvMMC1jUy9KtYY+dKC1TeKp//0OaWSfP4us+Vl361YX94a5AsjX7czA81qsxx2xYzniMQi8ewAEn7s5zkIlx4ftRuhmJ2P3v7TsDQk065yMQfKQgV5YF69rWAgzxrsQG6T6DLJoUpzjWnZigwwpiRRQVb3NA55KrOFFjtaegeR/2cA3md",
        subRefreshToken: "A13/P0xGAbjSLiK9J0UKkW0NHZ00Mh6vYdG3MUuJM217HsyGEdwQPFllcOyqQpqrrqXu4ALeUicgyb8cnDlQ11qF796CVLsaitB9PjCn/n/BN5ijMilMNopxbS331waDQXWPJWuuk/pPyWxpMfNlEI428ujCx34OhvTAaK6cObgLgcVhwYExHUL83/UtJs/zsScORByMlK7SxbpoUxx6NhfdlTxI0AsJEbX4tykDb8ZZk8KBFtYrUzbvGHPDgOlo/MdZW8Vz9as4VQ+lDp90hBKhZL3MoyWUUvRMUDl0CqI5tW4zAZiNyf0ru+sUl7r0XquWhGqiuqsGrpPgQhgSpnhcpS7FtxdR6rlxlYxpPyIfbKP3ftYYCENyzCj8B0cKbClrxv6TkFNX0/KAR/+1Qwfzrbh2OMYBeFLle1ye1U93+6VyVZ4b5IoSNajxpaGRGPmEURcIzu9uR3juL3890wIFc7ho07uA8NzHBZtNhfHsNLqHmqDm0LsJpjXLHsAmraKPN+qDjA/6HT+Rx4KMP1CIEM+4hrNZUx7nXfmKZxZRwd+eX4GtE5jqJYKGiQC1",
        userStatus: 0,
        lastRefreshedAt: null,
        createdAt: now,
        updatedAt: now
      },
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', null, {});
  }
};
