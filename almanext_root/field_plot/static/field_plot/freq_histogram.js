var width //= $('#infotabs').width() - 50;
var height //= $('#infotabs').height() - 40;
var margin = {left: 50, right: 40, top: 10, bottom: 15, xlabel: 25, ylabelLeft: 10, ylabelRight: 10};

var svg, xScale, yScale1, yScale2, xAxis, yAxis1, yAxis2, g

var bucket_size = 0.01 // in GHz

var minF;
var maxF;
var minC;
var maxC;
var minS;
var maxS;
var minFO;
var maxFO;

export function showFreqHistogram(plot_properties, plot_freqs)
{
    minF = plot_properties.min_frequency // lowest frequency bucket
    maxF = plot_properties.max_frequency // highest frequency bucket
    minC = plot_properties.min_cs
    maxC = plot_properties.max_cs
    minS = plot_properties.min_avg_sens
    maxS = plot_properties.max_avg_sens
    minFO = plot_properties.min_freq_obs_count // highest number of observations covering any bucket
    maxFO = plot_properties.max_freq_obs_count // see above

    width = $('#infotabs').width() - 20;
    height = $('#infotabs').height() - 70;
    //margin = 5;
    
    // =========== DEFINE AXIS ===========
    // frequency buckets
    xScale = d3.scaleLinear()
        .domain([minF, maxF])
        .range([margin.left, width - margin.right]);
    xAxis = d3.axisBottom()
        .ticks(10)
        .scale(xScale)

    // line sensitivity TODO
    yScale1 = d3.scaleLinear()
        .domain([maxC, minC])
        .range([height - margin.bottom, margin.top])
    yAxis1 = d3.axisLeft() 
        .scale(yScale1).ticks(10)

    // observation count
    yScale2 = d3.scaleLinear()
        .domain([minFO, maxFO])
        .range([height - margin.bottom - margin.top, 0])
    yAxis2 = d3.axisRight() 
        .scale(yScale2)

    // Create an SVG object
    svg = d3.select("#tab-frequency-coverage")
        .append("svg")
        .attr("width", width)
        .attr("height", height + margin.bottom)
        .attr("display", "block")
        .style("margin-top", margin.top)

    // X axis
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
        .attr('transform', 'translate(' + margin.left + ',0)')
        .call(yAxis1)
    g = svg.append("text")             
        .attr("transform", "translate(" + margin.ylabelLeft + "," + (height/2) + ")rotate(-90)")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Line sensitivity (mJy/beam)");

    // right Y axis
    g = svg.append("g")
        .attr('id', 'y-axis2')
        .attr('transform', 'translate(' + (width - margin.right) + ',' + margin.top + ')')
        .call(yAxis2)
    g = svg.append("text")             
        .attr("transform", "translate(" + (width + margin.ylabelRight) + "," + (height/2) + ")rotate(-90)")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Observation count");

    // draw the CS graph
    drawCSPoints(plot_freqs)
    drawFreqObsBars(plot_freqs)
    drawControls()
}

export function updateFreqHistogramAxis(plot_properties, plot_freqs)
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
    // update the axis (with animations!)
    xScale.domain([minF, maxF])
    yScale1.domain([maxC, minC])
    yScale2.domain([minFO, maxFO])
    
    svg.select("#x-axis").transition().duration(2000).call(xAxis)
    svg.select("#y-axis1").transition().duration(2000).call(yAxis1)
    svg.select("#y-axis2").transition().duration(2000).call(yAxis2)
    
    // redraw the CS graph
    drawCSPoints(plot_freqs)
    drawFreqObsBars(plot_freqs)
}

export function updateFreqHistogram(pixel_obs)
{
    svg.selectAll('rect').attr("class", "freq-coverage-obs-bar")
    if(pixel_obs != null)
    {
        svg.selectAll('rect').each(function() {
            var rect = d3.select(this)
            var rect_obs = rect.attr("observations")
            var bar_obs = rect_obs.split(",").map(Number)
            pixel_obs.some(function(obs)
            {
                var index = obs.index
                if(bar_obs.includes(index))
                {
                    rect.attr("class", "freq-coverage-obs-bar highlight")
                    return true
                }
                else
                   rect.attr("class", "freq-coverage-obs-bar")
            })
        })
    }
}

function drawCSPoints(plot_freqs)
{
    console.log(yScale1.domain())
    svg.selectAll('path').remove()

    var cs_line = d3.line()
        .defined(function(d) { return d.cs != null })
        .x(function(d) { return xScale(d.freq)})
        .y(function(d) { return yScale1(d.cs)})

    svg.append('path')
        //.data([plot_freqs].filter(cs_line.defined()))
        .attr('class', 'line')
        .attr('d', cs_line(plot_freqs))
}

function drawFreqObsBars(plot_freqs)
{
    svg.selectAll('rect').remove()
    
    svg.selectAll('rect')
        .data(removeEmpty(plot_freqs))
        .enter()
        .append('rect')
        .attr("type", "static")
        .attr("observations", function(f) { return f.observations})
        .attr("x", function(f) { return xScale(f.freq)})
        .attr("y", function(f) { return yScale2(f.observations.length) + margin.top})
        .attr("width", function() { return getWidth(bucket_size)})
        .attr("height", function(f) { return height - margin.top - margin.bottom - yScale2(f.observations.length)})
        .attr("class", "freq-coverage-obs-bar")
}

function drawControls()
{
    document.getElementById("tab-frequency-coverage").innerHTML += `
        <br><span class='text-label'>asd</span> 
        <select id='freq-histogram-yaxis2'>
            <option value='obs_count'>Number of observations</option>
            <option value='total_area'>Total area</option>
            <option value='overlap_area'>Total overlap area</option>
        </select>`
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

