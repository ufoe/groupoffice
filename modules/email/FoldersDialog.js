/**
 * Copyright Intermesh
 * 
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 * 
 * If you have questions write an e-mail to info@intermesh.nl
 * 
 * @version $Id: FoldersDialog.js 14816 2013-05-21 08:31:20Z mschering $
 * @copyright Copyright Intermesh
 * @author Merijn Schering <mschering@intermesh.nl>
 */

GO.email.FoldersDialog = function(config) {
	Ext.apply(this, config);

	this.foldersTree = new Ext.tree.TreePanel({
		animate : true,
		border : false,
		autoScroll : true,
		height : 200,
		loader : new GO.base.tree.TreeLoader({
			dataUrl : GO.url("email/account/subscribtionsTree"),
			baseParams : {
				list_all : 1,
				account_id : 0
			},
			preloadChildren : true,
			listeners : {
				beforeload : function() {
					this.body.mask(GO.lang.waitMsgLoad);
				},
				load : function() {
					this.body.unmask();
				},
				scope : this
			}
		})
	});

	// set the root node
	this.rootNode = new Ext.tree.AsyncTreeNode({
		text : GO.email.lang.root,
		draggable : false,
		id : 'root',
		expanded : false
	});
	this.foldersTree.setRootNode(this.rootNode);

	this.rootNode.on('load', function() {
		this.rootNode.select();

	}, this);

	this.foldersTree.on('checkchange', function(node, checked) {
		
		var route = checked ? 'email/folder/subscribe' : 'email/folder/unsubscribe';

		GO.request({
			maskEl:this.body,
			url : route,
			params : {
				account_id : this.account_id,
				mailbox : node.attributes.mailbox
			},
			fail:function(){
				this.foldersTree.getRootNode().reload();
			},
			scope : this
		});

	}, this);

	var treeEdit = new Ext.tree.TreeEditor(this.foldersTree, {
		ignoreNoChange : true
	});

	treeEdit.on('beforestartedit', function(editor, boundEl, value) {
		if (editor.editNode.attributes.folder_id == 0
			|| editor.editNode.attributes.mailbox == 'INBOX') {
			alert(GO.email.lang.cantEditFolder);
			return false;
		}
	});

	treeEdit.on('beforecomplete', function(editor, text, value) {
		
		GO.request({
			url : 'email/folder/rename',
			params : {
				account_id: editor.editNode.attributes.account_id,
				mailbox: editor.editNode.attributes.mailbox,
				name: text
			},
			fail : function() {
				this.foldersTree.getRootNode().reload();
			}
		});

	});

	GO.email.FoldersDialog.superclass.constructor.call(this, {
		layout : 'fit',
		modal : false,
		shadow : false,
		minWidth : 300,
		minHeight : 300,
		height : 400,
		width : 500,
		plain : true,
		closeAction : 'hide',
		title : GO.email.lang.folders,

		items : this.foldersTree,

		tbar : [{
			iconCls : 'btn-delete',
			text : GO.lang.cmdDelete,
			cls : 'x-btn-text-icon',
			scope : this,
			handler : function() {
				var sm = this.foldersTree.getSelectionModel();
				var node = sm.getSelectedNode();

				if(!node|| node.attributes.folder_id<1)
				{
					Ext.MessageBox.alert(GO.lang.strError, GO.email.lang.selectFolderDelete);
				}else if(node.attributes.mailbox=='INBOX')
				{
					Ext.MessageBox.alert(GO.lang.strError, GO.email.lang.cantDeleteInboxFolder);
				}else
				{
					GO.deleteItems({
						url: GO.url("email/folder/delete"),
						params: {						
							account_id:this.account_id,
							mailbox: node.attributes.mailbox
						},
						callback: function(responseParams)
						{
							if(responseParams.success)
							{
								node.remove();								
							}else
							{
								Ext.MessageBox.alert(GO.lang.strError,responseParams.feedback);
							}
						},
						count: 1,
						scope: this
					});
				}
			}
		}, {
			iconCls : 'btn-add',
			text : GO.lang.cmdAdd,
			cls : 'x-btn-text-icon',
			handler : function() {

				var sm = this.foldersTree.getSelectionModel();
				var node = sm.getSelectedNode();

				if (!node) {
					Ext.MessageBox.alert(GO.lang.strError,
						GO.email.lang.selectFolderAdd);
				} else {
					Ext.MessageBox.prompt(GO.lang.strName,
						GO.email.lang.enterFolderName, function(button,
							text) {

							if (button == 'ok') {
								GO.request({
									url: "email/folder/create",
									maskEl: Ext.getBody(),
									params: {
										parent: node.attributes.mailbox,
										account_id: this.account_id,
										name: text
									},
									success: function(options, response, result)
									{								
										delete node.attributes.children;
										node.reload();
									},
									fail : function(){
										this.rootNode.reload();
									},
									scope: this
								});
						
							}
						}, this);
				}
			},
			scope : this
		}, {
			iconCls : 'btn-refresh',
			text : GO.lang.cmdRefresh,

			cls : 'x-btn-text-icon',
			handler : function() {
				this.rootNode.reload();
			},
			scope : this
		}

		],
		buttons : [{
			text : GO.lang.cmdClose,
			handler : function() {
				this.hide();
			},
			scope : this
		}]
	});
}

Ext.extend(GO.email.FoldersDialog, Ext.Window, {

	show : function(account_id) {

		this.render(Ext.getBody());

		this.account_id = account_id;
		this.foldersTree.loader.baseParams.account_id = account_id;

		if (!this.rootNode.isExpanded())
			this.rootNode.expand();
		else
			this.rootNode.reload();

		GO.email.FoldersDialog.superclass.show.call(this);

	},

	getSubscribtionData : function() {
		var data = [];
		for (var i = 0; i < this.allFoldersStore.data.items.length; i++) {
			data[i] = {
				id : this.allFoldersStore.data.items[i].get('id'),
				subscribed : this.allFoldersStore.data.items[i]
				.get('subscribed'),
				name : this.allFoldersStore.data.items[i].get('name')
			};
		}
		return data;
	}
});