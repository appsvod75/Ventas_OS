const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log(`--- [401] AUTH REJECTED: No token for ${req.method} ${req.url} ---`);
        return res.status(401).json({ message: 'Autenticación requerida' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log(`--- [OK] AUTH PASSED: User ${decoded.id} for ${req.method} ${req.url} ---`);
        next();
    } catch (error) {
        console.log(`--- [401] AUTH REJECTED: JWT Error for ${req.method} ${req.url}: ${error.message} ---`);
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
};

module.exports = authMiddleware;
