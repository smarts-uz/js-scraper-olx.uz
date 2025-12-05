import UserAgent from 'user-agents';


const userAgent = new UserAgent([/Chrome/, {deviceCategory: 'desktop'}]);
logger.info(userAgent.toString());
logger.info(JSON.stringify(userAgent.data, null, 2));

// `--user-agent=${userAgent.toString()}`