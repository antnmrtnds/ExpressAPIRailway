"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = setupRoutes;
const searchRoutes_1 = require("./searchRoutes");
const analysisRoutes_1 = require("./analysisRoutes");
const resultsRoutes_1 = require("./resultsRoutes");
const authRoutes_1 = require("./authRoutes");
const adminRoutes_1 = require("./adminRoutes");
function setupRoutes(app) {
    const apiV1 = '/api/v1';
    app.use(`${apiV1}/auth`, authRoutes_1.authRoutes);
    app.use(`${apiV1}/search`, searchRoutes_1.searchRoutes);
    app.use(`${apiV1}/analysis`, analysisRoutes_1.analysisRoutes);
    app.use(`${apiV1}/results`, resultsRoutes_1.resultsRoutes);
    app.use(`${apiV1}/admin`, adminRoutes_1.adminRoutes);
    app.get(`${apiV1}/docs`, (req, res) => {
        res.json({
            version: '1.0.0',
            endpoints: {
                auth: `${apiV1}/auth`,
                search: `${apiV1}/search`,
                analysis: `${apiV1}/analysis`,
                results: `${apiV1}/results`,
                admin: `${apiV1}/admin`
            },
            documentation: 'https://docs.upspy.com/api'
        });
    });
}
