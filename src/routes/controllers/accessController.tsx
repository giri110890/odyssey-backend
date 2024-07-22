const access_store = require('../../data_store/access');
const { listAllShadowUsers } = require('../../data_store/users');
const { getItem } = require('../../data_store/access')

// Returns the access information for any user that is shadowing
//  the current user. We use the permissions token to identify
//  the current user so no parameters are needed. 
async function getAccess(req: any, res: any) {

  if (!req.validated_user_id) {
    return res.status(401).json({ error: "No middleware validated user id" });
  }
  const result = await access_store.getItems(req.validated_user_id);
  return res.status(200).json({ access: result });

}
// API to get shadow manager properties
async function getShadowManagerProperties(req: any, res: any) {
  try {
    let shadow_user_id = req.query.shadow_user_id;

    let user = await getItem(shadow_user_id);

    let assign_properties = user[0]?.options?.properties;

    if (assign_properties !== undefined) {
      return res.status(200).json({ assign_properties });
    } else {
      assign_properties = []
      return res.status(200).json({assign_properties, error: 'Assign properties not found for the given user.' });
    }
  }
  catch (error) {
    console.error('Get all shadow user  error:');
  }
}

module.exports = {
  getAccess,
  getShadowManagerProperties
}