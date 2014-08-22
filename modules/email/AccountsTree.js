/** 
 * Copyright Intermesh
 * 
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 * 
 * If you have questions write an e-mail to info@intermesh.nl
 * 
 * @version $Id: AccountsTree.js 15395 2013-08-06 10:18:32Z mschering $
 * @copyright Copyright Intermesh
 * @author Merijn Schering <mschering@intermesh.nl>
 */
 
GO.email.AccountsTree = function(config){
	if(!config)
	{
		config = {};
	}
	config.layout='fit';
  config.split=true;
	config.autoScroll=true;
	config.width=200;
	
	config.animate=true;
	config.loader=new GO.base.tree.TreeLoader(
	{
		baseParams:{
			expandedNodes:""
		},
		dataUrl:GO.url("email/account/tree"),
		preloadChildren:true
	});
	
	config.loader.on('beforeload', function(loader, node){
		loader.baseParams.expandedNodes = Ext.encode(this.getExpandedNodes());
	}, this);

	config.loader.on('load',function(loader,node,response){
		
		var result = Ext.decode(response.responseText);
		
		if(result.success===false){
//			GO.errorDialog.show(result.feedback);
			node.setText(node.text+' ('+GO.lang.strError+')');
			node.setTooltip(result.feedback, GO.lang.strError);
			
			if(result.exceptionClass && result.exceptionClass=='GO_Base_Mail_ImapAuthenticationFailedException'){
				this._errorNodes.push(node.attributes);
			}
		}
	  
//		this._setErrorNodes(Ext.decode(response.responseText));
		this._nodeId = 0;
		this._handleFailedIMAPConnections();
	},this);
	
	
//	config.loader.on("load", function(treeLoader, node)
//	{
//		node.attributes.parentExpanded=true;
//	}, this);

	config.containerScroll=true;
	config.rootVisible=false;
	config.collapseFirst=false;
	config.collapsible=true;
	config.collapseMode='mini';
	config.header=false;
	config.ddAppendOnly=true;
	config.containerScroll=true;	
	config.enableDD=true;
	config.ddGroup='EmailDD';
	
	config.bbar=new Ext.Toolbar({cls:'go-paging-tb',items:[this.statusBar = new Ext.Panel({height:20, baseCls:'em-statusbar',border:false, plain:true})]});

	GO.email.AccountsTree.superclass.constructor.call(this, config);	
	
	
	// set the root node
//	var rootNode = new Ext.tree.AsyncTreeNode({
//		text: 'Root',
//		id:'bs-folder-0',
//		draggable:false,
//		iconCls : 'folder-default',
//		expanded:false
//	});
//	this.setRootNode(rootNode);
	
	// set the root node
	var root = new Ext.tree.AsyncTreeNode({
		text: GO.email.lang.accounts,
		draggable:false,
		id:'root'
	});
	
	root.on("beforeload", function(){
		//stop state saving when loading entire tree
		this.disableStateSave();
	}, this);
	
	this.setRootNode(root);
	
	
	this.on('collapsenode', function(node)
	{		
		if(this.saveTreeState && node.childNodes.length)
			this.updateState();		
	},this);

	this.on('expandnode', function(node)
	{		
		if(node.id!="root" && this.saveTreeState && node.childNodes.length)
			this.updateState();
		
		
		//if root node is expanded then we are done loading the entire tree. After that we must start saving states
		if(node.id=="root"){			
			this.enableStateSave();
		}
	},this);

	this.on('nodedragover', function(e)
	{		
		if(e.dropNode)
		{
			var dragId = GO.util.Base64.decode(e.source.dragData.node.id);
			var targetId = GO.util.Base64.decode(e.target.id);
			//drag within tree
			if(dragId.indexOf('account')>-1 && targetId.indexOf('account')>-1){
				if(e.point!='append')
					return true;
				else
					e.target.collapse();
			}
			if(e.point!='append'){
				return false;
			}
			return ((this.getNodeById(e.dropNode.id).parentNode.id != e.target.id) &&
					(e.source.dragData.node.attributes.account_id == e.target.attributes.account_id));
		}else
		{
			//drag from grid
			if(e.point!='append'){
				return false;
			}else
			{
				return true;
			}
		}		
	}, this);	
	
	
	
	
	this.mailboxContextMenu = new GO.email.MailboxContextMenu({		
		treePanel:this,
		messagesGrid:this.messagesGrid
	});
	
	
	this.accountContextMenu = new GO.email.AccountContextMenu({		
		treePanel:this,
		messagesGrid:this.messagesGrid
	});
	
	this.on('beforeclick', function(node){
		if(node.attributes.noselect==1)
			return false;
	});
	
	this.on('contextmenu', function(node, e){
		e.stopEvent();
		
		if(node.attributes.noselect==1)
			return false;
		
		//no content menu for read only mail accounts
		if(node.attributes.permission_level < GO.permissionLevels.create)
		  return false;

		var selModel = this.getSelectionModel();
		
		if(!selModel.isSelected(node))
		{
			selModel.clearSelections();
			selModel.select(node);
		}
		
		var coords = e.getXY();

		if(node.attributes.isAccount){
			this.accountContextMenu.setNode(node);
			this.accountContextMenu.showAt([coords[0], coords[1]]);
		}else
		{
			this.mailboxContextMenu.setNode(node);
			this.mailboxContextMenu.showAt([coords[0], coords[1]]);
		}
		
	}, this);
	
	
	
	
	
	
	
	this.on('startdrag', function(tree, node, e){
		var dragId = GO.util.Base64.decode(node.id);
		if(dragId.indexOf('account')>-1){
			tree.dropZone.appendOnly=false;
		}else
		{
			tree.dropZone.appendOnly=true;
		}
	}, this);

	this.on('beforenodedrop', function(e){
		if(!e.dropNode)
		{
			var s = e.data.selections, messages = [];

			for(var i = 0, len = s.length; i < len; i++){
				messages.push(s[i].id);
			}

			if(messages.length>0)
			{
				
				var firstDraggedMessage = s[0].data;
			
				if(e.rawEvent.ctrlKey){
					return this.copyDroppedNodes(e);
				}
					
					
				

				if(firstDraggedMessage["account_id"] != e.target.attributes['account_id'])
				{
					var params = {
						task:'move',
						from_account_id:this.mainPanel.messagesGrid.store.baseParams.account_id,
						to_account_id:e.target.attributes['account_id'],
						from_mailbox:this.mainPanel.messagesGrid.store.baseParams.mailbox,
						to_mailbox:e.target.attributes['mailbox'],
						messages:Ext.encode(messages)
					}
					Ext.MessageBox.progress(GO.email.lang.moving, '', '');
					Ext.MessageBox.updateProgress(0, '0%', '');

				

					var moveRequest = function(newMessages){

						if(!newMessages)
						{
							params.total=messages.length;
						}else
						{
							params.messages=Ext.encode(newMessages);
						}

						GO.request({
							timeout:300000,
							url:"email/message/move",
							params:params,
							success:function(options, response, result){
								if(result.messages && result.messages.length>0)
								{
									Ext.MessageBox.updateProgress(result.progress, (result.progress*100)+'%', '');
									moveRequest.call(this, result.messages);
								}else
								{
									this.mainPanel.messagesGrid.store.reload({
										callback:function(){

											if(this.mainPanel.messagePanel.uid && !this.mainPanel.messagesGrid.store.getById(this.mainPanel.messagePanel.uid))
											{
												this.mainPanel.messagePanel.reset();
											}

											Ext.MessageBox.hide();
										},
										scope:this
									});
								}

							},
							scope:this
						});
					}
					moveRequest.call(this);

				}else	if(firstDraggedMessage.mailbox == e.target.mailbox)
				{
					return false;
				}else
				{
					this.mainPanel.messagesGrid.store.baseParams['action']='move';
//					this.messagesGrid.store.baseParams['from_account_id']=this.account_id;
//					this.messagesGrid.store.baseParams['to_account_id']=e.target.attributes['account_id'];
//					this.messagesGrid.store.baseParams['from_mailbox']=this.mailbox;
					this.mainPanel.messagesGrid.store.baseParams['to_mailbox']=e.target.attributes['mailbox'];
					this.mainPanel.messagesGrid.store.baseParams['messages']=Ext.encode(messages);

					this.mainPanel.messagesGrid.store.reload({
						callback:function(){
							if(this.mainPanel.messagePanel.uid && !this.mainPanel.messagesGrid.store.getById(this.mainPanel.messagePanel.uid))
							{
								this.mainPanel.messagePanel.reset();
							}
						},
						scope:this
					});

					delete this.mainPanel.messagesGrid.store.baseParams['action'];
//					delete this.messagesGrid.store.baseParams['from_mailbox'];
					delete this.mainPanel.messagesGrid.store.baseParams['to_mailbox'];
					delete this.mainPanel.messagesGrid.store.baseParams['messages'];
//					delete this.messagesGrid.store.baseParams['to_account_id'];
//					delete this.messagesGrid.store.baseParams['from_account_id'];
				}

			}
		}
	},
	this);

	this.on('nodedrop', function(e){
		if(e.dropNode)
		{
			var dragId = GO.util.Base64.decode(e.source.dragData.node.id);
			var targetId = GO.util.Base64.decode(e.target.id);
			
			if(dragId.indexOf('account')>-1 && targetId.indexOf('account')>-1 && e.point!='append'){
				var sortorder=[];
				var c = this.getRootNode().childNodes;

				for(var i=0;i<c.length;i++){
					sortorder.push(c[i].attributes.account_id);
				}
				GO.request({
					url: "email/account/saveSort",
					params: {
						sort_order: Ext.encode(sortorder)
					}
				});
			}else
			{
				this.moveFolder(e.target.attributes['account_id'], e.target , e.data.node);
			}
		}

		this.dropZone.appendOnly=true;
	},
	this);
	
	

	
	
	
//	this.treeEditor = new Ext.tree.TreeEditor(
//		this,
//		new Ext.form.TextField({
//			cancelOnEsc:true,
//			completeOnEnter:true,
//			maskRe:/[^:]/
//		}),
//		{
//			listeners:{
//				complete  : this.afterEdit,
//				startedit : function( editor, boundEl, value )
//				{
//					editor.setValue(editor.editNode.attributes.mailbox);
//				},
//				beforecomplete  : function( editor, value, startValue){
//					value=value.trim();
//					if(GO.util.empty(value)){
//						editor.focus();
//						return false;
//					}
//				},
//				scope:this
//			}
//		});
}

Ext.extend(GO.email.AccountsTree, Ext.tree.TreePanel, {	
	
	saveTreeState : false,
	
	_nodeId : 0,
	_errorNodes : [],
	
	enableStateSave : function(){
		if(Ext.Ajax.isLoading(this.getLoader().transId)){
			this.enableStateSave.defer(100, this);
			this.loadingDone=false;
		}else
		{
			if(!this.loadingDone){
				this.loadingDone=true;
				this.enableStateSave.defer(100, this);
			}else{
				this.saveTreeState=true;
			}
		}
	},
	
	disableStateSave : function(){
		this.loadingDone=false;
		this.saveTreeState=false;
	},
	
	updateState : function(){
		GO.request({
			url:"email/account/saveTreeState",
			params:{
				expandedNodes:Ext.encode(this.getExpandedNodes())
			}
		});
	},
	setUsage : function(usage){		
			this.statusBar.body.update(usage);
	},
	
	findInboxNode : function(node){
		
		if(node.attributes.isAccount){
			accountNode=node;
		}else
		{
			var p = node.parentNode;
			var accountNode=false;
			while(p){
					if(p.attributes.isAccount){
							accountNode=p;
							break;
					}
					p = p.parentNode;
			}
		}
		
		if(!accountNode)
			return false;
		
		return accountNode.findChild('mailbox','INBOX');
	},
	
	getExpandedNodes : function(){
		var expanded = new Array();
		this.getRootNode().cascade(function(n){
			if(n.expanded){
			expanded.push(n.attributes.id);
			}
		});
		
		return expanded;
	},
	
	moveFolder : function(account_id, targetNode, node)
	{
	
		GO.request({
			url:"email/folder/move",
			params:{				
				account_id:account_id,
				sourceMailbox:node.attributes.mailbox,
				targetMailbox:targetNode.attributes.mailbox
			},
			fail : function(){
				this.refresh();
			},
			success:function(options, response, result)
			{
				
				this.refresh(node.parentNode);
				
//				var responseParams = Ext.decode(response.responseText);
//				if(responseParams.success)
//				{
//					//remove preloaded children otherwise it won't request the server
//					delete node.parentNode.attributes.children;
//					node.parentNode.reload();
//				}else
//				{
//					var accountNode = this.getNodeById('account_'+account_id)
//					if(accountNode)
//						accountNode.reload();
//					
//					Ext.MessageBox.alert(GO.lang.strError,responseParams.feedback);
//				}								
			},
			scope:this
		});
	},
	
	refresh : function(node){
		//todo only reload current node.
		if(node){
			//remove preloaded children otherwise it won't request the server
			delete node.attributes.children;
			node.reload();
		}else
		{
			this.getRootNode().reload();
		}
	},
	
	_handleFailedIMAPConnections : function() {
		var errorNode=this._errorNodes.shift();
//		if(typeof(errorNode)!='Object' && errorNode!==false)
//			errorNode=this._errorNodes.shift();
//		
		if(errorNode){
			
			this.accountId =errorNode['account_id'];
			if (!this.imapLoginFailedDialog)
				this.imapLoginFailedDialog = new GO.Window({
					title: GO.lang['strError'],
					layout: 'fit',
					width: 320,
					height: 220,
					cls : 'go-form-panel',
					items: [this.imapLoginFailedFormPanel = new Ext.form.FormPanel({
						items: [this.imapLoginFailedInfoField = new GO.form.PlainField({
							value: GO.email.lang['imapLoginFailed'],
							hideLabel: true,
							//							height: 80,
							anchor: '-20'
						}), this.passwordField = new Ext.form.TextField({
							fieldLabel : GO.lang.strPassword,
							name : 'password',
							inputType : 'password',
							allowBlank : false,
							anchor: '-20'
						}),new Ext.ux.form.XCheckbox({
							boxLabel: GO.email.lang.storePassword,
							checked: false,
							name: 'store_password',
							allowBlank: true,
							hideLabel:true
						})],
						buttons: [{
							text : GO.lang.cmdOk,
							handler : function() {
								this.imapLoginFailedFormPanel.form.submit({
									url: GO.url('email/account/savePassword'),
									params: {
										id: this.accountId
									},
									success : function(form, action) {
										this.imapLoginFailedDialog.hide();
										this.imapLoginFailedFormPanel.form.reset();
										this.root.reload();
									},
									failure : function(form, action) {
										var error = '';
										if (action.failureType == 'client') {
											error = GO.lang.strErrorsInForm;
										} else if (action.result) {
											error = action.result.feedback;
										} else {
											error = GO.lang.strRequestError;
										}
											
										Ext.MessageBox.alert(GO.lang.strError, error);
									},
									scope: this
								});
							},
							scope : this
						}, {
							text : GO.lang.cmdClose,
							handler : function() {
								this.imapLoginFailedDialog.hide();
								this.imapLoginFailedFormPanel.form.reset();
								this._handleFailedIMAPConnections();								
							},
							scope : this
						}]
					})]
				});
			this.imapLoginFailedInfoField.setValue(GO.email.lang['imapLoginFailed'].replace('%username',errorNode.name)+' '+GO.email.lang['tryNewCredentials']);
			this.imapLoginFailedDialog.show();
		}
	
	},
	
	
	copyDroppedNodes : function(e){
		
		
		var srcMessages=[];
		for (var i=0; i<e.data.selections.length;i++) {
			srcMessages.push({
				accountId :e.data.selections[i].data.account_id,
				mailboxPath : e.data.selections[i].data.mailbox,
				mailUid : e.data.selections[i].data.uid
			});
		}
		
		var params = {
			targetAccountId:e.target.attributes['account_id'],
			targetMailboxPath:e.target.attributes['mailbox'],
			srcMessages: Ext.encode(srcMessages)
		}

		GO.request({
			maskEl:GO.mainLayout.getModulePanel('email').getEl(),
			timeout:300000,
			url:"email/account/copyMailTo",
			params:params,
			success:function(options, response, result){
				this.mainPanel.messagesGrid.store.load();		
			},
			scope:this
		});
					
	}

//	_setErrorNodes : function (nodes) {
//		this._errorNodes = [];
//		for (var nodeId in nodes) {
//			if (!nodes[nodeId].isAccount && !GO.util.empty(nodes[nodeId].hasError))
//				this._errorNodes.push(nodes[nodeId]);
//		}
//	}
//	
//	afterEdit : function(editor, text, oldText ){
//
//		GO.request({
//			url:'email/folder/submit',
//			params:{				
//				parent:editor.editNode.parentNode.id=='root' ? "" : editor.editNode.parentNode.attributes.mailbox,
//				account_id:editor.editNode.parentNode.attributes.account_id,
//				oldmailbox:oldText,
//				newmailbox:text
//			},
//			success: function(response, options, result)
//			{
//				if(!result.success)
//				{					
//					editor.editNode.destroy();
//					alert(result.feedback);
//				}				
//			},
//			scope:this
//		});
//	}
});