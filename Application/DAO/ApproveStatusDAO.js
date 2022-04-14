const ApproveDTO = require('../models').ApproveStatus
const Op = require('../models').Sequelize.Op
class ApproveStatusDAO {
  constructor() {
    this.ApproveDTO = ApproveDTO
  }

  async getStautsCode(name) {
    const status = await this.ApproveDTO.findOne({
      where: {
        name: {
          [Op.like]: name
        }
      }
    })
    return status.code
  }

  async getAllCode() {
    const allStatusList = await this.ApproveDTO.findAll()
    return allStatusList
  }
}

module.exports = new ApproveStatusDAO()
