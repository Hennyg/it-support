const {
  getGraphToken,
  graphPatch,
  jsonResponse
} = require("../shared/graph");

module.exports = async function (context, req) {

  const body = req.body || {};

  if (!body.id) {
    context.res = jsonResponse(400, {
      error: "Missing user id"
    });
    return;
  }

  try {

    const token = await getGraphToken();

    await graphPatch(
      token,
      `/users/${body.id}`,
      {
        displayName: body.displayName,
        givenName: body.givenName,
        surname: body.surname,
        jobTitle: body.jobTitle,
        department: body.department,
        companyName: body.companyName,
        officeLocation: body.officeLocation,
        employeeId: body.employeeId,
        mobilePhone: body.mobilePhone,
        businessPhones: body.businessPhones || [],
        streetAddress: body.streetAddress,
        postalCode: body.postalCode,
        city: body.city,
        state: body.state,
        country: body.country,
        accountEnabled: body.accountEnabled
      }
    );

    context.res = jsonResponse(200, {
      success: true
    });

  } catch (err) {

    context.res = jsonResponse(500, {
      error: err.message
    });

  }
};
