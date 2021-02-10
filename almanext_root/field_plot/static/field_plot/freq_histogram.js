var width //= $('#infotabs').width() - 50;
var height //= $('#infotabs').height() - 40;
var margin = {left: 50, right: 40, top: 10, bottom: 15, xlabel: 25, ylabelLeft: 15, ylabelRight: 10};

var svg, xScale, yScale1, yScale2, xAxis, yAxis1, yAxis2, g, drawArea, linesArea, transform_store

var bucket_size = 0.01 // in GHz
var z = 0 // selected redshift
const c = 299792458 // speed of light

var minF;
var maxF;
var minC;
var maxC;
var minS;
var maxS;
var minFO;
var maxFO;
var minFA;
var maxFA;

export function showFreqHistogram(plot_properties, plot_freqs, emission_lines)
{
    minF = plot_properties.min_frequency // lowest frequency bucket
    maxF = plot_properties.max_frequency // highest frequency bucket
    minC = plot_properties.min_cs
    maxC = plot_properties.max_cs
    minS = plot_properties.min_avg_sens
    maxS = plot_properties.max_avg_sens
    minFO = plot_properties.min_freq_obs_count // highest number of observations covering any bucket
    maxFO = plot_properties.max_freq_obs_count // see above
    minFA = plot_properties.min_freq_obs_t_area
    maxFA = plot_properties.max_freq_obs_t_area

    width = $('#infotabs').width() - 20;
    height = $('#infotabs').height() - 50;

    document.getElementById("tab-frequency-coverage").innerHTML = "<div id='histogram'></div><div id=histogram-controls-wrapper></div>"
    //margin = 5;
    
    // =========== DEFINE AXIS ===========
    // frequency buckets
    xScale = d3.scaleLinear()
        .domain([minF, maxF])
        .range([margin.left, width - margin.right]);
    xAxis = d3.axisBottom()
        .scale(xScale)

    // left scale - default: number of observations per frequency
    yScale1 = d3.scaleLinear()
        .domain([minFO, maxFO])
        .range([height - margin.bottom - margin.top, 0])
    yAxis1 = d3.axisLeft() 
        .scale(yScale1)

    // line sensitivity
    yScale2 = d3.scaleLinear()
        .domain([maxC, minC])
        .range([height - margin.bottom, margin.top])
    yAxis2 = d3.axisRight() 
        .scale(yScale2).ticks(10)


    // Create an SVG object
    svg = d3.select("#histogram")
        .append("svg")
        .attr("width", width)
        .attr("height", height + margin.bottom)
        .attr("display", "block")
        .style("margin-top", margin.top)

    // X axis
    /*var clipX = svg.append("clipPath")
        .attr('id', 'clip-x-axis')
        .append('rect')
        .attr('x', margin.left)
        .attr('y', height - margin.bottom)
        .attr('width', width - margin.left - margin.right)
        .attr('height', margin.bottom);*/
    g = svg.append("g")
        .attr('id', 'x-axis')
        .attr('transform', 'translate(0,' + (height-margin.bottom) + ')')
        .call(xAxis)
    g = svg.append("text")             
        .attr("transform", "translate(" + (width/2) + " ," + (height - margin.bottom + margin.xlabel) + ")")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Frequency (GHz)");

    // left Y axis
    g = svg.append("g")
        .attr('id', 'y-axis1')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(yAxis1
            .tickFormat(d3.format(".0s")))
    g = svg.append("text")
        .attr("id", "y-axis1-label")             
        .attr("transform", "translate(" + margin.ylabelLeft + "," + (height/2) + ")rotate(-90)")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Observation count");

    // right Y axis
    g = svg.append("g")
        .attr('id', 'y-axis2')
        .attr('transform', 'translate(' + (width - margin.right) + ',0)')
        .call(yAxis2)
    g = svg.append("text")             
        .attr("transform", "translate(" + (width + margin.ylabelRight) + "," + (height/2) + ")rotate(-90)")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Line sensitivity (mJy/beam)");

    var clip1 = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip1")
        .append("svg:rect")
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("x", margin.left)
        .attr("y", margin.top);
    
    var clip2 = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip2")
        .append("svg:rect")
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("x", margin.left)
        .attr("y", margin.top);
    
    drawArea = svg.append("g")
        .attr("clip-path", "url(#clip1)")

    linesArea = svg.append("g")
        .attr("clip-path", "url(#clip2)")

    // draw the CS graph
    drawCSPoints(plot_freqs) //I have to fix the scaling issues
    drawFreqObsBars(plot_freqs)
    drawEmissionLines(emission_lines)
    drawControls()
    
    const extent = [[margin.left, 0], [width - margin.right, 0]];

    transform_store = d3.zoomIdentity
    svg.call(d3.zoom()
        .scaleExtent([1, 1000])
        .translateExtent(extent)
        .extent(extent)
        .on("zoom", () => zoomed(d3.event.transform)));
}

function zoomed(transform)
{
    if(transform != undefined)
    {
        transform_store = transform
    }
    var new_xScale = transform_store.rescaleX(xScale)
    //xScale.range([margin.left, width - margin.right].map(d => d3.event.transform.applyX(d)));
    drawArea.selectAll("rect")
        .attr("transform", "translate(" + transform_store.x+",0)scale(" + transform_store.k + ",1)")
        //.attr("x", function(f) { return xScale(f.freq)})
        //.attr("width", function() { return getWidth(bucket_size)});
    drawArea.selectAll("path")
        .attr("transform", "translate(" + transform_store.x+",0)scale(" + transform_store.k + ",1)")
        //.attr("x", (function(d) { return xScale(d.freq)}))
    svg.selectAll("#x-axis").call(xAxis.scale(transform_store.rescaleX(xScale)));
    linesArea.selectAll("svg")
        .attr("x", function(l) {return(new_xScale(l.frequency/(1+z)))})
        //.attr("transform", "translate(" + d3.event.transform.x+",0) scale(" + d3.event.transform.k + ",1)")
}

export function updateFreqHistogram(plot_properties, plot_freqs, emission_lines)
{
    // get the new plot's properties
    minF = plot_properties.min_frequency
    maxF = plot_properties.max_frequency
    console.log(minF)
    console.log(minF)
    minC = plot_properties.min_cs
    maxC = plot_properties.max_cs
    minS = plot_properties.min_avg_sens
    maxS = plot_properties.max_avg_sens
    minFO = plot_properties.min_freq_obs_count 
    maxFO = plot_properties.max_freq_obs_count
    minFA = plot_properties.min_freq_obs_t_area
    maxFA = plot_properties.max_freq_obs_t_area
    // update the axis (with animations!)
    xScale.domain([minF, maxF])
    yScale1.domain([minFO, maxFO])
    yScale2.domain([maxC, minC])
    
    svg.select("#x-axis").transition().duration(2000).call(xAxis)
    svg.select("#y-axis1").transition().duration(2000).call(yAxis1)
    svg.select("#y-axis2").transition().duration(2000).call(yAxis2)
    
    // redraw the CS graph
    //drawCSPoints(plot_freqs)
    drawFreqObsBars(plot_freqs)
    drawEmissionLines(emission_lines)
}

export function highlightFreqHistogram(pixel_obs)
{
    drawArea.selectAll('rect').attr("class", "freq-histogram-obs-bar")
    if(pixel_obs != null)
    {
        drawArea.selectAll('rect').each(function() {
            var rect = d3.select(this)
            var rect_obs = rect.attr("observations")
            var bar_obs = rect_obs.split(",").map(Number)
            pixel_obs.some(function(obs)
            {
                var index = obs.index
                if(bar_obs.includes(index))
                {
                    rect.attr("class", "freq-histogram-obs-bar highlight")
                    return true
                }
                else
                    rect.attr("class", "freq-histogram-obs-bar")
            })
        })
    }
}

function drawCSPoints(plot_freqs)
{
    console.log(yScale1.domain())
    drawArea.selectAll('path').remove()

    var cs_line = d3.line()
        .defined(function(d) { return d.cs != null })
        .x(function(d) { return xScale(d.freq)})
        .y(function(d) { return yScale2(d.cs)})

    drawArea.append('path')
        //.data([plot_freqs].filter(cs_line.defined()))
        .attr('class', 'line')
        .attr('d', cs_line(plot_freqs))
}

function drawFreqObsBars(plot_freqs)
{
    drawArea.selectAll('rect').remove()
    
    drawArea.selectAll('rect')
        .data(removeEmpty(plot_freqs))
        .enter()
        .append('rect')
        .attr("type", "static")
        .attr("observations", function(f) { return f.observations})
        .attr("x", function(f) { return xScale(f.freq)})
        .attr("y", function(f) { return yScale1(f.observations.length) + margin.top})
        .attr("width", function() { return getWidth(bucket_size)})
        .attr("height", function(f) { return height - margin.top - margin.bottom - yScale1(f.observations.length)})
        .attr("class", "freq-histogram-obs-bar")
}

export function drawEmissionLines(emission_lines)
{
    linesArea.selectAll("svg").remove()
    // only render those lines that fall inside the frequency interval
    var visible_lines = emission_lines.filter((em) => {return(em.frequency/(1+z) > minF && em.frequency/(1+z) < maxF)})
    // create a group to place the emission lines
    var em_lines_g = linesArea.selectAll("svg")
        .data(visible_lines)
    createLinesSVG(em_lines_g)
}

export function changeAxisData(data_id)
{
    console.log(data_id)
    switch(data_id)
    {
        case "obs_count":
        {
            yScale1.domain([minFO, maxFO])
            svg.select("#y-axis1").transition().duration(1000).call(yAxis1)
            $('#y-axis1-label').html("Observation count")
            drawArea.selectAll('rect')
                .transition()
                .duration(500)
                .attr("y", function(f) { return yScale1(f.observations.length) + margin.top})
                .attr("height", function(f) { return height - margin.top - margin.bottom - yScale1(f.observations.length)})
            break
        }
        case "total_area":
        {
            yScale1.domain([minFA, maxFA])
            svg.select("#y-axis1").transition().duration(1000).call(yAxis1)
            $('#y-axis1-label').html("Area (arcsec&#178;)")
            drawArea.selectAll('rect')
                .transition()
                .duration(500)
                .attr("y", function(f) { return yScale1(f.total_area) + margin.top})
                .attr("height", function(f) { return height - margin.top - margin.bottom - yScale1(f.total_area)})
            break
        }
    }
}

function drawControls()
{
    document.getElementById("histogram-controls-wrapper").innerHTML = `
            <div class='histogram-control'>
                <span class='text-label'>Vertical axis</span> 
                <select id='freq-histogram-yaxis1'>
                    <option value='obs_count'>Number of observations</option>
                    <option value='total_area'>Total area</option>
                </select>
            </div>
            <div class="sep-vertical-small"></div>
            <div class='histogram-control'>
                <span class='text-label'>Show emission lines</span>
                <input type="checkbox" name="checkbox-1" id="freq-histogram-emissionlines">
                <label for="freq-histogram-emissionlines" class="checkbox-clean"></label>
            </div>
            <div class="histogram-control">
                <span class='text-label'>Redshift</span>
                <div id="freq-histogram-redshift" class="freq-histogram-slider-range"></div>
            </div>
            <div class="histogram-control">
                <div class='z-tiny-labels'>
                    z= <span id='z-factor'></span><br>
                    v= <span id='z-speed'></span> km/s
                </div>
            </div>
            `
    updateSliderLabels(0)

    // convert the above elements to JQueryUI instances
    $("#freq-histogram-yaxis1").selectmenu(
    {
        change: function(event, ui)
        {
            changeAxisData(ui.item.value)
        }
    })
    $("#freq-histogram-emissionlines").checkboxradio();
    $("#freq-histogram-emissionlines").click(function() {
        if($(this).is(":checked"))
        {
            $("#freq-histogram-redshift").slider("enable")
            linesArea.selectAll("svg").transition().duration(500).style("opacity", 1.0)
        }
        else
        {
            $("#freq-histogram-redshift").slider("disable")
            linesArea.selectAll("svg").transition().duration(500).style("opacity", 0.0)
        }
    })
    $("#freq-histogram-redshift").slider(
    {
        // this redshift is expressed in km/s
        min: -0.004, 
        max: 0.004,  
        value:[0],
        step: 0.0001,
        disabled: true,
        slide: function(event, ui) 
        {   
            z = ui.value      
            updateSliderLabels(z)
            zoomed()
        }
    })
    $("#freq-histogram-redshift").dblclick(function() {
        z = 0
        $(this).slider("value", 0)
        updateSliderLabels(0)
        zoomed()
    })

    function updateSliderLabels(z)
    {
        $("#z-factor").text(z.toFixed(5))
        $("#z-speed").text((z/1000*c).toFixed(2))
    }
}

function createLinesSVG(em_lines_g)
{
    var line = em_lines_g
        .enter()
        .append("svg")
        .attr("x", function(e) {return xScale(e.frequency/(1+z))-5})
        .attr("y", margin.top)
        .attr("width", 50)
        .attr("height", 200)
        .style("opacity", 0.0)
    line.append("rect")
        .attr("x", 0)
        .attr("y", 85)
        .attr("width", 10)
        .attr("height", 30)
        .attr("stroke", "#b4b40f")
        .attr("stroke-width", 4)
        .attr("fill", "#b4b40f")
    line.append("text")
        .attr("dominant-baseline", "middle")
        .attr("font-family", "verdana")
        .attr("font-size", "10px")
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(6,100) rotate(270)")
        .text(function(e) {return e.species})
    line.append("line")
        .attr("stroke", "#b4b40f")
        .attr("stroke-linecap", "null")
        .attr("stroke-linejoin", "null")
        .attr("y2", "85")
        .attr("x2", "5")
        .attr("y1", "0")
        .attr("x1", "5")
        .attr("stroke-width", "2")
        .attr("fill", "none")
    line.append("line")
        .attr("stroke", "#b4b40f")
        .attr("stroke-linecap", "null")
        .attr("stroke-linejoin", "null")
        .attr("y2", "200")
        .attr("x2", "5")
        .attr("y1", "115")
        .attr("x1", "5")
        .attr("stroke-width", "2")
        .attr("fill", "none")
}

// returns the width of a given element given its start and end values
function getWidth(start, end)
{
    // this allows us to get the width of any number smaller than minF
    if(arguments.length == 1)
        return xScale(start) - xScale(0)
    return xScale(end) - xScale(start)
}

function removeEmpty(freq_array)
{
    return freq_array.filter((d) => {return d.observations.length != 0})
}

