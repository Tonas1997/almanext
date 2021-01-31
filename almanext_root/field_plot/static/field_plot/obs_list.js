var obs_table
/**
 * Creates a HTML list containing the observations
 */
export function showObservationList(data)
{
    //var table_string = '<table id="obs_list" class="display" width="100%"></table>'
    //$('#tab-observations').html(table_string)
    console.log(data.observations)
    obs_table = $('#obs_list').DataTable( 
    {
        data: data.observations,
        columns: [
            { "data": "project_code"},
            { "data": "source_name" },
            { "data": "ra" },
            { "data": "dec" },
            { "data": "total_area" },
            { "data": "overlap_area" }
        ],
        "scrollY": "200px",
        "paging": false,
        "searching": false,
        "info": false,
        "orderClasses": false
    } 
    ).columns.adjust().draw();
}

export function getObservationRowData(tr)
{
    return obs_table.row(tr).data()
}

export function updateObservationList(data)
{
    obs_table.clear();
    obs_table.rows.add(data.observations).draw()
}

export function highlightRows(obs_list)
{
    obs_table.rows().every(function() 
    {
        this.nodes().to$().removeClass('highlighted-row')
    })
    if(obs_list != null)
    {
        var id_list = []
        for (var i = 0; i < obs_list.length; i++)
        {
            id_list.push(obs_list[i]["index"])
        }
        obs_table.rows().every(function() 
        {
            var rowData = this.data();
            if(id_list.includes(rowData.index))
                $(this.node()).addClass('highlighted-row');
        })
    } 
}
