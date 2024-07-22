const{getAllCompany,getCompanyById,createCompany} = require('../../data_store/company')

const { validationResult } = require('express-validator');




// sujith - to get all company
async function getAllCompanies(req, res) {
  try {
    // req.params.property_manager_id
    let { company_id } = req.params;
    if (company_id) {
      let all_records = await getAllCompany(company_id);
      if (all_records.length == 0) {
        res.status(200).json({ message: 'No company found' });
      } else {
        res.status(200).json(all_records);
      }
    }
    else {
      res.status(404).json({ error: 'Company id not found.' });
    }
  } catch (error) {
    console.error('Get all c error:');
  }
}
//Sujith - api to get a company
async function getCompanyInfoById(req, res) {
  try {
    let company_id = req.query.id;
    if (company_id) {
      const company = await getCompanyById(company_id);
      if (company.length == 0) {
        res.status(200).json("company not Found");
      } else {
        res.status(200).json(company);
      }
    } else {
      res.status(404).json({ error: 'company id{$req.query.company_id} not found.' });
    }
  } catch (error) {
    console.error('Get a company By Id Error');
  }
}
//API to add a company
async function addCompany(req, res) {
    try {
      let company_id = req.query.company_id;
      if (company_id) {
        if (!company_id) {
          return res.status(400).json({ error: 'company  id not found' });
        }
        let errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        let company = req.body;
        company.company_id = company_id;
        let result = await createCompany(company);
        company.id = result.id
        if (result.id) {
          res.status(200).json({ id: result.id });
        }
        else {
          res.status(404).json({ error: 'Error while adding tenant' });
        }
      } else {
        res.status(404).json({ error: 'Company id not found.' });
      }
    } catch (error) {
      console.error('Add tenant Error:', error);
      res.status(500).json({ error: 'An error occurred while processing your request' });
    }
  }
  module.exports = {
    addCompany,
    getCompanyInfoById,
    getAllCompanies,
  }


  