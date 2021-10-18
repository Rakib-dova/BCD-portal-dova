"use strict";

const express = require("express");
const router = express.Router();

const getInfo = (req, res, next) => {
  res.render("info", {
    //csrfToken: req.csrfToken(),
  });

  //res.sendFile("/Service/public/html/info.html");
};

router.get("/", getInfo);

module.exports = {
  router: router,
  getInfo: getInfo,
};
