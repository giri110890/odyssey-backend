const access_store = require('../data_store/access');
const { AccessRoles } = require( '../routes/middleware/permission/permissions' );


export async function ensureAccessExists(user_id: string, access_roles: [AccessRoles], options: any) : Promise<any> {
    let result = await access_store.ensureAccessExists(user_id, access_roles, options);
    return result;
}
