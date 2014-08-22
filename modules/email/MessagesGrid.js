/** 
 * Copyright Intermesh
 * 
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 * 
 * If you have questions write an e-mail to info@intermesh.nl
 * 
 * @version $Id: MessagesGrid.js 17663 2014-06-11 06:45:11Z mschering $
 * @copyright Copyright Intermesh
 * @author Merijn Schering <mschering@intermesh.nl>
 */
 
GO.email.MessagesGrid = function(config){
	
	if(!config)
	{
		config = {};
	}
	
	config.layout='fit';
	config.autoScroll=true;
	config.paging=true;
	
	config.hideMode='offsets';

	if(config.region=='north')
	{
		this.searchtypeWidth = 150;
		this.searchfieldWidth = 320;
		config.cm = new Ext.grid.ColumnModel({
		defaults:{
			sortable:true
			},
			columns:[
			{
				header:"&nbsp;",
				width:50,
				dataIndex: 'icon',
				renderer: this.renderIcon,
				hideable:false,
				sortable:false
			},{
				header: GO.email.lang.from,
				dataIndex: 'from',
				renderer:this.renderNorthMessageRow,
				id:'from',
				width:200
			},{
				header: GO.email.lang.subject,
				dataIndex: 'subject',
				renderer:this.renderNorthMessageRow,
				width:200
			},{
				header: GO.lang.strDate,
				dataIndex: 'arrival',
				width:120,
				renderer:this.renderNorthArrival,
				align:'right'
			},{
				header: GO.email.lang.dateSent,
				dataIndex: 'date',
				width:120,
				renderer:this.renderNorthDate,
				align:'right',
				hidden:true
			},{
				header: GO.lang.strSize,
				dataIndex: 'size',
				width:65,
				align:'right',
				hidden:true,
				renderer:Ext.util.Format.fileSize
			}]
		});
//		config.view=new Ext.grid.GridView({
//			emptyText: GO.lang['strNoItems'],
//			getRowClass:function(row, index) {				
//				if (row.data.seen == '0') {
//					return 'ml-unseen-row';
//				} else {
//					return 'ml-seen-row';
//				}
//			}
//		});
	
	}else
	{
		this.searchtypeWidth = 120;
		this.searchfieldWidth = 150;
		config.cm =  new Ext.grid.ColumnModel({
		defaults:{
			sortable:true
		},
		columns:[
		{
			id:'icon',
			header:"&nbsp;",
			width:46,
			dataIndex: 'icon',
			renderer: this.renderIcon,
			hideable:false,
			sortable:false
		},{
			header: GO.email.lang.message,
			dataIndex: 'from',
			renderer: this.renderMessage,
			css: 'white-space:normal;',
			id:'message'
		
		},{
			id:'arrival',
			header: GO.lang.strDate,
			dataIndex:'arrival',
			renderer: this.renderArrival,
			width:80,
			align:'right'
		},{
			id:'date',
			header: GO.email.lang.dateSent,
			dataIndex:'date',
			renderer: this.renderDate,
			width:80,
			align:'right',
			hidden:true
		},{
			id:'size',
			header: GO.lang.strSize,
			dataIndex: 'size',
			width:65,
			align:'right',
			hidden:true,
			renderer:Ext.util.Format.fileSize
		}]
		});
		config.bbar = new Ext.PagingToolbar({
			cls: 'go-paging-tb',
			store: config.store,
			pageSize: parseInt(GO.settings['max_rows_list']),
			displayInfo: true,
			displayMsg: GO.lang.displayingItemsShort,
			emptyMsg: GO.lang['strNoItems']
		});
				
		config.autoExpandColumn='message';
		
//		config.view=new Ext.grid.GridView({
//			emptyText: GO.lang['strNoItems']
//		});
	}
	
	config.view=new Ext.grid.GridView({
			emptyText: GO.lang['strNoItems'],
			getRowClass:function(row, index) {				
				if (row.data.seen == '0') {
					return 'ml-unseen-row';
				} else {
					return 'ml-seen-row';
				}
			}
		});
	
	config.sm=new Ext.grid.RowSelectionModel();
	config.loadMask=true;
			
	config.border=false;
	config.split= true;
	config.header=false;
	config.enableDragDrop= true;
	config.ddGroup = 'EmailDD';
	config.animCollapse=false;

	this.searchType = new GO.form.ComboBox({
		width:this.searchtypeWidth,
		store: new Ext.data.SimpleStore({
			fields: ['value', 'text'],
			data : [
			['any', GO.email.lang.anyField],
			['from', GO.email.lang.searchFrom],
			['subject', GO.email.lang.subject],
			['to', GO.email.lang.searchTo],
			['cc', GO.email.lang.searchCC]
			]
		}),
		value:GO.email.search_type_default,
		valueField:'value',
		displayField:'text',
		mode:'local',
		triggerAction:'all',
		editable:false,
		selectOnFocus:true,
		forceSelection:true
	});

	this.searchField = new GO.form.SearchField({
		store: config.store,
		paramName:'search',
		emptyText:GO.lang['strSearch'],
		width:this.searchfieldWidth
	});
        
	this.showUnreadButton = new Ext.Button({
		text:GO.email.lang.showUnread,
		enableToggle:true,
		toggleHandler:this.toggleUnread,
		pressed:false,
		style:'margin-left:10px'
	});

	if(!config.hideSearch)
	{
		config.tbar = [this.searchType, this.searchField, this.showUnreadButton];
	}	
	
	GO.email.MessagesGrid.superclass.constructor.call(this, config);

	var origRefreshHandler = this.getBottomToolbar().refresh.handler;

	this.getBottomToolbar().refresh.handler=function(){
		this.store.baseParams.refresh=true;
		origRefreshHandler.call(this);
		delete this.store.baseParams.refresh;
	};
	
	//stop/start drag and drop when store loads when account is readOnly
	this.store.on('load', function(store, records, options) {
	  if(store.reader.jsonData.permission_level <= GO.permissionLevels.read)
		this.getView().dragZone.lock();
	  else
		this.getView().dragZone.unlock();
	}, this);

	this.searchType.on('select', function(combo, record)
	{
		GO.email.search_type = record.data.value;

		if(this.searchField.getValue())
		{
			GO.email.messagesGrid.store.baseParams['search'] = this.searchField.getValue();
			this.searchField.hasSearch = true;
                        
			GO.email.messagesGrid.store.reload();
		}
                
	}, this);
        
};

Ext.extend(GO.email.MessagesGrid, GO.grid.GridPanel,{
        
	show : function()
	{
		if(GO.email.messagesGrid.store.baseParams['unread'] === 1 || GO.email.messagesGrid.store.baseParams['unread'] === true){
			this.showUnreadButton.pressed=true;
			this.showUnreadButton.setText(GO.email.lang.showAll);
		} else {
			this.showUnreadButton.pressed=false;
			this.showUnreadButton.setText(GO.email.lang.showUnread);
		}
		
		if(!GO.email.search_type)
		{
			GO.email.search_type = GO.email.search_type_default;
		}
		this.setSearchFields(GO.email.search_type, GO.email.search_query);

		GO.email.MessagesGrid.superclass.show.call(this);
	},
	resetSearch : function()
	{
		GO.email.search_type = GO.email.search_type_default;
		GO.email.search_query = '';
                
		this.setSearchFields(GO.email.search_type, GO.email.search_query);
	},
	setSearchFields : function(type, query)
	{
		this.searchType.setValue(type);
		this.searchField.setValue(query);

		this.searchField.hasSearch = (query) ? true : false;
	},
	toggleUnread : function(item, pressed)
	{
		GO.email.messagesGrid.store.baseParams['unread']=pressed ? 1 : 0;
                
		if(pressed)
			item.setText(GO.email.lang.showAll);
		else
			item.setText(GO.email.lang.showUnread);
								
		GO.email.messagesGrid.store.load();
	},
	
	renderNorthMessageRow : function(value, p, record){
		if(record.data['seen']=='0')
			return String.format('<div id="sbj_'+record.data['uid']+'" class="ml-unseen-mail">{0}</div>', value);
		else
			return String.format('<div id="sbj_'+record.data['uid']+'" class="ml-seen-mail">{0}</div>', value);
	},
	
	renderMessageSmallRes : function(value, p, record){
		
		if(record.data['seen']=='0')
		{
			return String.format('<div id="sbj_'+record.data['uid']+'" class="ml-unseen-from">{0}</div><div class="ml-unseen-subject">{1}</div>', value, record.data['subject']);
		}else
		{
			return String.format('<div id="sbj_'+record.data['uid']+'" class="ml-seen-from">{0}</div><div class="ml-seen-subject">{1}</div>', value, record.data['subject']);
		}
	},
	
	renderMessage : function(value, p, record){
		
		var deletedCls = record.data.deleted ? 'ml-deleted' : '';
		
		if(record.data['seen']=='0')
		{
			return String.format('<div id="sbj_'+record.data['uid']+'" class="ml-unseen-from '+deletedCls+'">{0}</div><div class="ml-unseen-subject '+deletedCls+'">{1}</div>', value, record.data['subject']);
		}else
		{
			return String.format('<div id="sbj_'+record.data['uid']+'" class="ml-seen-from '+deletedCls+'">{0}</div><div class="ml-seen-subject '+deletedCls+'">{1}</div>', value, record.data['subject']);
		}
	},
					
	renderNorthDate : function(value, p, record){
		return value+' '+record.data.date_time;
	},
					
	renderNorthArrival : function(value, p, record){
		return value+' '+record.data.arrival_time;
	},
					
	renderArrival : function(value, p, record){
		if(record.data['seen']=='0')
		{
			return String.format('<div id="arr_'+record.data['uid']+'" class="ml-unseen-from">{0}</div><div class="ml-unseen-subject">{1}</div>', value, record.data['arrival_time']);
		}else
		{
			return String.format('<div id="arr_'+record.data['uid']+'" class="ml-seen-from">{0}</div><div class="ml-seen-subject">{1}</div>', value, record.data['arrival_time']);
		}
	},
					
	renderDate : function(value, p, record){
		if(record.data['seen']=='0')
		{
			return String.format('<div id="date_'+record.data['uid']+'"  class="ml-unseen-from">{0}</div><div class="ml-unseen-subject">{1}</div>', value, record.data['date_time']);
		}else
		{
			return String.format('<div id="date_'+record.data['uid']+'" class="ml-seen-from">{0}</div><div class="ml-seen-subject">{1}</div>', value, record.data['date_time']);
		}
	},
					
	renderIcon : function(src, p, record){
		var str = '';

		var cls = "email-grid-icon ";

		if(record.data.answered=='1' && record.data.forwarded=='1')
		{
			cls += "btn-message-answered-and-forwarded";
		}else if(record.data.answered=='1'){
			cls += "btn-message-answered";
		}else if(record.data.forwarded=='1'){
			cls += "btn-message-forwarded";
		}else
		{
			if(record.data.seen=='1')
				cls += "btn-message-seen";
			else
				cls += "btn-message";
		}
		str += '<div class="'+cls+'"></div>';
		
		if(record.data['has_attachments']=='1')
		{
			str += '<div class="email-grid-icon ml-icon-attach"></div>';
		//str += '<img src=\"' + GOimages['attach'] +' \" style="display:block" />';
		}else
		{
		//str += '<br />';
		}
		
		if(record.data['x_priority'])
		{
			if(record.data['x_priority'] < 3)
			{
				str += '<div class="email-grid-icon btn-high-priority"></div>';
			}
			
			if(record.data['x_priority'] > 3)
			{
				str += '<div class="email-grid-icon btn-low-priority"></div>';
			}
		}
		
		if(record.data['flagged']==1)
		{
			//str += '<img src=\"' + GOimages['flag'] +' \" style="display:block" />';
			str += '<div class="email-grid-icon btn-flag"></div>';
		}
		
		return str;
		
	},

		

	renderFlagged : function(value, p, record){

		var str = '';

		if(record.data['flagged']==1)
		{
			//str += '<img src=\"' + GOimages['flag'] +' \" style="display:block" />';
			str += '<div class="go-icon btn-flag"></div>';
		}
		if(record.data['attachments'])
		{
			str += '<div class="go-icon btn-attach"></div>';
		//str += '<img src=\"' + GOimages['attach'] +' \" style="display:block" />';
		}
		return str;

	}
});
