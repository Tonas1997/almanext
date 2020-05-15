var parameters = {}

function getBands()
{
    band_list = []
    for (i = 3; i < 11; i++)
    {
        element_id = "#formfield_band" + i
        if($(element_id).is(":checked"))
            band_list.push(i)
    }
    console.log(band_list)
    return band_list
}

function checkParams()
{
    var error = false

    parameters = {
        ra: parseFloat($("#formfield_ra").val()),
        dec: parseFloat($("#formfield_dec").val()),
        size: parseFloat($("#formfield_size").val()),
        bands: getBands(),
        redshift: parseFloat($("#formfield_redshift").val()),
        res: parseFloat($("#formfield_res").val())
    }
    // check for the RA value
    if(isNaN(parameters.ra))
    {
        // handle error
        console.log("RA!")
        error = true
    }
    // check for the Dec value
    if(isNaN(parameters.dec))
    {
        // handle error
        console.log("Dec!")
        error = true
    }
    // check for the size value
    if(isNaN(parameters.size))
    {
        // handle error
        console.log("Size!")
        error = true
    }
    // check if the user selected at least one band
    if(parameters.bands.length == 0)
    {
        // handle error
        console.log("Bands!")
        error = true
    }
    // check for the resolution value
    if(isNaN(parameters.res))
    {
        // handle error
        console.log("Res!")
        error = true
    }
    // return null if there's a faulty argument, the arg list otherwise
    if(error)
        return null
    else
        return parameters
}

$(document).on('input', '#formfield_redshift', function()
{
    $('#redshift-val').html( parseFloat($(this).val()).toFixed(1) )
});

$("#form-plot").on('submit', function(event)
{
    event.preventDefault()
    // check parameters
    var data = checkParams()
    if(data == null)
    {
        return;
    }   
    else
    {
        console.log(parameters)
        $.ajax(    
            {
                url: '/get_plot/',
                data: parameters,
                data_type: 'json',
                success: function(data) {
                    alert('success!')
                    render_data(data, parameters.size, parameters.res)
                }
            })
    }
});
