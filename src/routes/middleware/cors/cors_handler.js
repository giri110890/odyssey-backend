function cors_handler(req, res, next) {
    var oneof = false;
    // console.log("request received: " + req.headers.origin);
    if (req.headers.origin) {
      res.header("Access-Control-Allow-Origin", req.headers.origin);
      //  res.header('Access-Control-Allow-Origin', "http://api.wunderground.com");
      console.log("Origin:" + req.headers.origin);
      oneof = true;
    }
    if (req.headers["access-control-request-method"]) {
      res.header(
        "Access-Control-Allow-Methods",
        req.headers["access-control-request-method"]
      );
      oneof = true;
    }
    if (req.headers["access-control-request-headers"]) {
      res.header(
        "Access-Control-Allow-Headers",
        req.headers["access-control-request-headers"]
      );
      oneof = true;
    }
    if (req.headers["access-control-allow-credentials"]) {
      res.header(
        "Access-Control-Allow-Credentials",
        req.headers["access-control-allow-credentials"]
      );
      oneof = true;
    }
    if (oneof) {
      res.header("Access-Control-Max-Age", 60 * 60 * 24 * 365);
    }
    res.header("Access-Control-Allow-Credentials", "true");
  
  
    // intercept OPTIONS method
    if (oneof && req.method == "OPTIONS") {
      res.sendStatus(200);
    } else {
      // console.log("request allowed");
      next();
    }
  }

  module.exports = {
    cors_handler
  }