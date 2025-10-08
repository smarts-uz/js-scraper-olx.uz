import UserAgent from 'user-agents';


const userAgent = new UserAgent([/Chrome/, {deviceCategory: 'desktop'}]);
console.log(userAgent.toString());
console.log(JSON.stringify(userAgent.data, null, 2));

// `--user-agent=${userAgent.toString()}`