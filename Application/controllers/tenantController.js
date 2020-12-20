
const express = require('express');
const Views = '../views/'
const Tenant = require('../models').Tenant;

const apihelper = require('../lib/apihelper')
  
module.exports = {
  findOne: async (tenantId) => {
    const tenant = await Tenant.findOne({
      where: {
        tenantId: tenantId
      }
    })

    return tenant
  }
}