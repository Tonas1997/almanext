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

function checkParams(data)
{
    var error = false

    var data = {
        ra: parseFloat($("#formfield_ra").val()),
        dec: parseFloat($("#formfield_dec").val()),
        size: parseFloat($("#formfield_size").val()),
        bands: getBands(),
        redshift: parseFloat($("#formfield_redshift").val()),
        res: parseFloat($("#formfield_res").val())
    }
    // check for the RA value
    if(isNaN(data.ra))
    {
        // handle error
        console.log("RA!")
        error = true
    }
    // check for the Dec value
    if(isNaN(data.dec))
    {
        // handle error
        console.log("Dec!")
        error = true
    }
    // check for the size value
    if(isNaN(data.size))
    {
        // handle error
        console.log("Size!")
        error = true
    }
    // check if the user selected at least one band
    if(data.bands.length == 0)
    {
        // handle error
        console.log("Bands!")
        error = true
    }
    // check for the resolution value
    if(isNaN(data.res))
    {
        // handle error
        console.log("Res!")
        error = true
    }
    // return null if there's a faulty argument, the arg list otherwise
    if(error)
        return null
    else
        return data
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
    console.log(data)
    if(data == null)
        return;
    else
    {
        alert(data)
    }
});
