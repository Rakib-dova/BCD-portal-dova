
const express = require('express');
const Views = '../views/'
const User = require('../models').User;

module.exports = {
  findOne: async (userId) => {
    const user = await User.findOne({
      where: {
        userId: userId
      }
    })

    return user
  }
}