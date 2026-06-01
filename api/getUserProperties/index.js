const { getGraphToken, graphGet, jsonResponse } = require("../shared/graph");

module.exports = async function (context, req) {

  const userId = req.query.id;

  if (!userId) {
    context.res = jsonResponse(400, {
      error: "Missing id"
    });
    return;
  }

  try {

    const token = await getGraphToken();

    const user = await graphGet(
      token,
      `/users/${userId}?$select=id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,companyName,officeLocation,employeeId,mobilePhone,businessPhones,streetAddress,postalCode,city,state,country,accountEnabled,createdDateTime,onPremisesSyncEnabled`
    );

    const licenses = await graphGet(
      token,
      `/users/${userId}/licenseDetails`
    );

    const groups = await graphGet(
      token,
      `/users/${userId}/memberOf?$select=id,displayName`
    );

    context.res = jsonResponse(200, {
      user,
      licenses: licenses.value || [],
      groups: groups.value || []
    });

  } catch (err) {

    context.res = jsonResponse(500, {
      error: err.message
    });

  }
};
