class ApiRespons{
    constructor(statusCode,data,message = "Success"){
        this.statuscode = statusCode
        this.data = data 
        this.message = message
        this.success = statusCode < 400
    }
}