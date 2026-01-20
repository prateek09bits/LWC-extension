async function callSalesforceAPI(instanceUrl, accessToken) {
    const response = await fetch(instanceUrl + "/services/data/v57.0/sobjects", {
        headers: {
            "Authorization": "Bearer " + accessToken
        }
    });

    const data = await response.json();
    console.log(data);
}
