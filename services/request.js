const axios = require('axios');

module.exports = async ({
  url, method = 'get', data = {}, auth,
}) => {
  const { data: result } = await axios({
    url,
    method,
    data,
    auth,
  }).catch((error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return Promise.reject(new Error(JSON.stringify({
        data: error.response.data,
        status: error.response.status,
        headers: error.response.headers,
      })));
    } if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      return Promise.reject(error.request);
    }
    // Something happened in setting up the request that triggered an Error
    return Promise.reject(error.message);
  });

  return result;
};
