const jwt = require('jsonwebtoken');
const payload = { user: { id: 'user_id_here' } };
const secret = 'c73226600b55cc67c27d773f76b10240d8b3d8fc74c2363986f84f819b6d5aef4f5597b28b5b0aa5a24282c192c337ce6a78dd7cd4332018ee74339e327ef1b8';

const token = jwt.sign(payload, secret, { expiresIn: '1h', algorithm: 'HS256' });

console.log(token); // Use this token for verification on jwt.io
function authMiddleware(req, res, next) {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
}

module.exports = authMiddleware;
