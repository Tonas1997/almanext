import
{
    renderData, // initial render
    updateCanvas, // plot update
    getPixelInfo, // gets the selected pixel
    canvas_chart // canvas object
} from "./plot.js"

// ========================================================
// ============== PLOT PARAMETERS MANAGEMENT ==============
// ========================================================

var parameters = {}
function getBands()
{
    var band_list = []
    for (var i = 3; i < 11; i++)
    {
        var element_id = "#formfield_band" + i
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
                    initializePlotView(data, parameters.size, parameters.res)
                }
            }
        )
    }
});

// ========================================================
// ================= PLOT USER INTERFACE ==================
// ========================================================

function initializePlotView(data, size, res)
{
    alert('success!')
    var plot_data = renderData(data, size, res)        

    initializePlotInfo(plot_data)
    initializePixelInfo()

    canvas_chart.on("mousemove",function()
    {
        var info = getPixelInfo(d3.mouse(this));
        
        if(info != null)
        {
            document.getElementById('pixel-ra').innerHTML = info.ra
            document.getElementById('pixel-dec').innerHTML = info.dec
            document.getElementById('pixel-n-obs').innerHTML = info.count_obs
            document.getElementById('pixel-avg-res').innerHTML = info.avg_res
            document.getElementById('pixel-avg-sens').innerHTML = info.avg_sens
            document.getElementById('pixel-avg-int-time').innerHTML = info.avg_int_time
            console.log(info.obs)
        }
        else
        {
            var nan = "--.--"
            document.getElementById('pixel-ra').innerHTML = nan
            document.getElementById('pixel-dec').innerHTML = nan
            document.getElementById('pixel-n-obs').innerHTML = nan
            document.getElementById('pixel-avg-res').innerHTML = nan
            document.getElementById('pixel-avg-sens').innerHTML = nan
            document.getElementById('pixel-avg-int-time').innerHTML = nan
        }
    });

    $("#plot-color-property").on('change', (function() {
        updateCanvas()
    }))
}

function initializePlotInfo(plot_data)
{
    document.getElementById('plot-total-area').innerHTML = "~" + plot_data.total_area
    document.getElementById('plot-overlap-area').innerHTML = "~" + plot_data.overlap_area
    document.getElementById('plot-overlap-area-pct').innerHTML = "~" + (plot_data.overlap_area/plot_data.total_area*100).toFixed(2)
}

function initializePixelInfo()
{
    document.getElementById('pixel-values').innerHTML =
    "<div class='value-box'><div class='text'>RA</div>" +
        "<div class='value'><div id='pixel-ra'> --.-- </div>&nbsp deg</div></div>" + 
    "<div class='value-box'><div class='text'>Dec</div>" +
        "<div class='value'><div id='pixel-dec'> --.-- </div>&nbsp deg</div></div>" + 
    "<div class='value-box'><div class='text'>Number of observations</div>" +
        "<div class='value'><div id='pixel-n-obs'> --.-- </div></div></div>" +
    "<div class='value-box'><div class='text'>Average resolution</div>" +
        "<div class='value'><div id='pixel-avg-res'> --.-- </div>&nbsp arcsec<sup>2</sup></div></div>" +
    "<div class='value-box'><div class='text'>Average sensitivity</div>" +
        "<div class='value'><div id='pixel-avg-sens'> --.-- </div>&nbsp mJy/beam</div></div>" +
    "<div class='value-box'><div class='text'>Average int. time</div>" +
        "<div class='value'><div id='pixel-avg-int-time'> --.-- </div>&nbsp s</div></div>"
}
