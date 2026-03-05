import { createServer } from 'node:http';
import { log } from './logger.js';
const parseBody = (req) => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
});
const createHealthServer = (options) => {
    const { port, getStatus, serviceToken } = options;
    const server = createServer(async (req, res) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        // Health check
        if (pathname === '/health' && req.method === 'GET') {
            const status = getStatus();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status));
            return;
        }
        // Trigger campaign crawl — POST /trigger
        if (pathname === '/trigger' && req.method === 'POST') {
            // Auth check
            const authHeader = req.headers['authorization'];
            if (serviceToken && authHeader !== `Bearer ${serviceToken}`) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            const queue = options.queue;
            if (!queue) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Queue not available' }));
                return;
            }
            try {
                const body = await parseBody(req);
                const data = JSON.parse(body);
                if (!data.campaignId || !data.keyword || !data.marketplace) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing required fields: campaignId, keyword, marketplace' }));
                    return;
                }
                const jobData = {
                    campaignId: data.campaignId,
                    keyword: data.keyword,
                    marketplace: data.marketplace,
                    maxPages: data.maxPages || 3,
                };
                const job = await queue.add(`force-run-${data.campaignId}`, jobData, {
                    priority: 1,
                });
                log('info', 'trigger', `Force-run job added for campaign ${data.campaignId} (jobId: ${job.id})`, {
                    campaignId: data.campaignId,
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, jobId: job.id }));
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                log('error', 'trigger', `Failed to add force-run job: ${message}`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: message }));
            }
            return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    });
    server.listen(port, () => {
        log('info', 'health', `Health check server listening on :${port}/health`);
    });
    return server;
};
export { createHealthServer };
//# sourceMappingURL=health.js.map