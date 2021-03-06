import url from 'url';
import https from 'https';

import debug from './debug';
import bufferStream from './bufferStream';
import agent from './registryAgent';

const npmRegistryURL =
  process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org';

function parseJSON(res) {
  return bufferStream(res).then(JSON.parse);
}

export default function fetchNpmPackageInfo(packageName) {
  return new Promise((resolve, reject) => {
    const encodedPackageName =
      packageName.charAt(0) === '@'
        ? `@${encodeURIComponent(packageName.substring(1))}`
        : encodeURIComponent(packageName);

    const infoURL = `${npmRegistryURL}/${encodedPackageName}`;

    debug('Fetching package info for %s from %s', packageName, infoURL);

    const { hostname, pathname } = url.parse(infoURL);
    const options = {
      agent: agent,
      hostname: hostname,
      path: pathname,
      headers: {
        Accept: 'application/json'
      }
    };

    https
      .get(options, res => {
        if (res.statusCode === 200) {
          resolve(parseJSON(res));
        } else if (res.statusCode === 404) {
          resolve(null);
        } else {
          bufferStream(res).then(data => {
            const content = data.toString('utf-8');
            const error = new Error(
              `Failed to fetch info for ${packageName}\nstatus: ${
                res.statusCode
              }\ndata: ${content}`
            );

            reject(error);
          });
        }
      })
      .on('error', reject);
  });
}
