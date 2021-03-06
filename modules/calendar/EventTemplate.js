GO.calendar.EventTemplate =
		'<tpl if="values.events && values.events.length">'+
		'{[this.collapsibleSectionHeader(GO.calendar.lang.forthcomingAppointments, "events-"+values.panelId, "events")]}'+
		
			'<table class="display-panel" cellpadding="0" cellspacing="0" border="0" id="events-{panelId}">'+
			'<tr>'+
				'<td class="table_header_links" width="16px;"></td>'+
				'<td class="table_header_links" width="10px;"></td>'+
				'<td class="table_header_links">' + GO.lang['strName'] + '</a></td>'+
				'<td class="table_header_links" width="110px">' + GO.calendar.lang.startsAt + '</td>'+
				'<td class="table_header_links" width="120px">' + GO.calendar.lang.calendar + '</td>'+
			'</tr>'+
			'<tpl if="!events.length">'+
				'<tr><td colspan="4">'+GO.lang.strNoItems+'</td></tr>'+
			'</tpl>'+
			'<tpl for="events">'+
				'<tr class="display-panel-link">'+
					'<td style="padding-right:0px !important;" {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}><div class="display-panel-link-icon go-model-icon-GO_Calendar_Model_Event"></div></td>'+
					'<td style="padding-right:0px !important;padding-left:0px !important;" {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}><div class="display-panel-has-links <tpl if="link_count&gt;1">has-links</tpl>"></div></td>'+
					'<td {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}><a href="#" onclick="GO.linkHandlers[\'GO_Calendar_Model_Event\'].call(this, {id});">{name}</a></td>'+
					'<td {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}>{start_time}</td>'+
					'<td {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}>{calendar_name}</td>'+
				'</tr>'+
				'<tpl if="description!=\'\'">'+
					'<tr class="display-panel-link">'+
						'<td style="padding-right:0px !important;" colspan="1" {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}><div></div></td>'+
						'<td style="padding-right:0px !important;padding-left:0px !important;" colspan="4" {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}><div>{description}</div></td>'+
					'</tr>'+
				'</tpl>'+
			'</tpl>'+
			'</table>'+
		'</tpl>'+
		'<tpl if="values.past_events && values.past_events.length">'+
		'{[this.collapsibleSectionHeader(GO.calendar.lang.pastAppointments, "pastEvents-"+values.panelId, "past_events")]}'+
			'<table class="display-panel" cellpadding="0" cellspacing="0" border="0" id="pastEvents-{panelId}">'+
			'<tr>'+
				'<td class="table_header_links" width="16px;"></td>'+
				'<td class="table_header_links" width="10px;"></td>'+
				'<td class="table_header_links">' + GO.lang['strName'] + '</a></td>'+
				'<td class="table_header_links" width="110px">' + GO.calendar.lang.startsAt + '</td>'+
				'<td class="table_header_links" width="120px">' + GO.calendar.lang.calendar + '</td>'+
			'</tr>'+
			'<tpl if="!past_events.length">'+
				'<tr><td colspan="4">'+GO.lang.strNoItems+'</td></tr>'+
			'</tpl>'+
			'<tpl for="past_events">'+
				'<tr class="display-panel-link">'+
					'<td style="padding-right:0px !important;" {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}><div class="display-panel-link-icon go-model-icon-GO_Calendar_Model_Event"></div></td>'+
					'<td style="padding-right:0px !important;padding-left:0px !important;" {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}><div class="display-panel-has-links <tpl if="link_count&gt;1">has-links</tpl>"></div></td>'+
					'<td {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}><a href="#" onclick="GO.linkHandlers[\'GO_Calendar_Model_Event\'].call(this, {id});">{name}</a></td>'+
					'<td {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}>{start_time}</td>'+
					'<td {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}>{calendar_name}</td>'+
				'</tr>'+
				'<tpl if="description!=\'\'">'+
					'<tr class="display-panel-link">'+
						'<td style="padding-right:0px !important;" colspan="1" {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}><div></div></td>'+
						'<td style="padding-right:0px !important;padding-left:0px !important;" colspan="4" {[xindex % 2 === 0 ? "class=\\\"display-panel-link-even\\\"" : ""]}><div>{description}</div></td>'+
					'</tr>'+
				'</tpl>'+
			'</tpl>'+
			'</table>'+
		'</tpl>';