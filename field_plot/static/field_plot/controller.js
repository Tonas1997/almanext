function checkParams(data)
{
    var error = false;
    if(isNaN(parseFloat(data.ra)))
    {
        // handle error
    }
    else
}


$("#form-plot").submit(function(event)
{
    data = {
        ra: $("#formfield_ra").val(),
        dec: $("#formfield_dec").val(),
        size: $("#formfield_size").val(),
        redshift: $("#formfield_redshift").val(),
        resolution: $("#formfield_res").val()
    }
    // check parameters
    if(!checkParams(data))
        return;

    
})