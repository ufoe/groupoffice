<?php

/*
 * Copyright Intermesh BV
 *
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 *
 * If you have questions write an e-mail to info@intermesh.nl
 */

/**
 * This controller can be extended for most of the groupoffice controllers
 * It has support for rendering JSON data from a loaded model or render failure output
 * 
 * @package GO.base.controller
 * @version $Id$
 * @copyright Copyright Intermesh BV.
 * @author Michael de Hart <mdhart@intermesh.nl>
 *
 */
abstract class GO_Base_Controller_AbstractJsonController extends GO_Base_Controller_AbstractController {

	/**
	 * @deprecated
	 * Get a Json object from the response data
	 * @param array $data
	 * @return GO_Base_Data_JsonResponse response object
	 */
	public function renderJson($data) {
		return new GO_Base_Data_JsonResponse($data);
	}
	
	/**
	 * Render JSON response for forms
	 * @param GO_Base_Db_ActiveRecord $model the AWR to renerated the JSON form data for
	 * @param array $remoteComboField List all fields that require a remote text to load for a remote combobox.
	 * eg. with a model you want to provide the category name so that that the
	 * category combo store does not need to be loaded to show it.
	 * 
	 * You would list that like this:
	 * 
	 * 'category_id'=>array('category','name')
	 * 
	 * The category name would be looked up in the model model ->category->name.
	 * A relation for this must be defined. See ActiveRecord->relations.
	 * @see GO_Base_Controller_AbstractModelController::remoteComboFields()
	 * @param array $extraFields the extra fields that should be attached to the data array as key => value
	 * @return GO_Base_Data_JsonResponse Response object
	 * @throws GO_Base_Exception_AccessDenied
	 */
	public function renderForm($model, $remoteComboFields = array(), $extraFields = array()) {

		$response = array('data' => array(), 'success' => true);

		//TODO: check if this can be moved. This methode renders JSON and should not check permissions.
		if (!$model->checkPermissionLevel($model->isNew ? GO_Base_Model_Acl::CREATE_PERMISSION : GO_Base_Model_Acl::WRITE_PERMISSION))
			throw new GO_Base_Exception_AccessDenied();

		//Init data array
		$response['data'] = array_merge($model->getAttributes(), $extraFields);
		$response['data']['permission_level'] = $model->getPermissionLevel();
		$response['data']['write_permission'] = true;

		//Add the customerfields to the data array
		if (GO::user()->getModulePermissionLevel('customfields') && $model->customfieldsRecord)
			$response['data'] = array_merge($response['data'], $model->customfieldsRecord->getAttributes());

		if (!empty($remoteComboFields))
			$response = $this->_loadComboTexts($model, $remoteComboFields, $response);
		
		$this->fireEvent('form', array(
				&$this,
				&$response,
				&$model,
				&$remoteComboFields
		));

		return new GO_Base_Data_JsonResponse($response);
	}

	/**
	 * Can be used in actionDisplay like actions
	 * @param GO_Base_Db_ActiveRecord $model the model to render display data for
	 * @param array $extraFields the extra fields that should be attached to the data array as key => value
	 * @return GO_Base_Data_JsonResponse Response object
	 */
	public function renderDisplay($model, $extraFields = array()) {
		$response = array('data' => array(), 'success' => true);
		$response['data'] = array_merge_recursive($extraFields, $model->getAttributes('html'));
		
		if (!empty($model->user))
			$response['data']['username'] = $model->user->name;
		if (!empty($model->mUser))
			$response['data']['musername'] = $model->mUser->name;
		
		//$response['data'] = $model->getAttributes('html');
		//$response['data']['model'] = $model->className();
		$response['data']['permission_level'] = $model->getPermissionLevel();
		$response['data']['write_permission'] = GO_Base_Model_Acl::hasPermission($response['data']['permission_level'], GO_Base_Model_Acl::WRITE_PERMISSION);


		$response['data']['customfields'] = array();

		if (!isset($response['data']['workflow']) && GO::modules()->workflow)
			$response = $this->_processWorkflowDisplay($model, $response);

		if ($model->customfieldsRecord)
			$response = $this->_processCustomFieldsDisplay($model, $response);

		if ($model->hasLinks()) {
			$response = $this->_processLinksDisplay($model, $response);

			if (!isset($response['data']['events']) && GO::modules()->calendar)
				$response = $this->_processEventsDisplay($model, $response);

			if (!isset($response['data']['tasks']) && GO::modules()->tasks)
				$response = $this->_processTasksDisplay($model, $response);
		}

		if (GO::modules()->files && !isset($response['data']['files']))
			$response = $this->_processFilesDisplay($model, $response);

		if (GO::modules()->comments)
			$response = $this->_processCommentsDisplay($model, $response);
		
		if (GO::modules()->lists)
			$response = GO_Lists_ListsModule::displayResponse($model, $response);

		$this->fireEvent('display', array(
				&$this,
				&$response,
				&$model
		));

		return new GO_Base_Data_JsonResponse($response);
	}

	/**
	 * Render the JSON outbut for a submit action to be used by ExtJS Form submit
	 * @param GO_Base_Db_ActiveRecord $model
	 * @return GO_Base_Data_JsonResponse Response object
	 */
	public function renderSubmit($model) {

		$response = array('feedback' => '', 'success' => true);
		//$ret = $this->beforeSubmit($response, $model, $params);
		//$modifiedAttributes = $model->getModifiedAttributes();
		if (!$model->hasValidationErrors() && !$model->isNew) { //model was saved
			$response['id'] = $model->pk;

			//If the model has it's own ACL id then we return the newly created ACL id.
			//The model automatically creates it.
			if ($model->aclField() && !$model->joinAclField)
				$response[$model->aclField()] = $model->{$model->aclField()};

			//TODO: move the link saving to the model someday
			if (!empty($_POST['link']) && $model->hasLinks()) {
				//a link is sent like  GO_Notes_Model_Note:1
				//where 1 is the id of the model
				$linkProps = explode(':', $_POST['link']);
				$linkModel = GO::getModel($linkProps[0])->findByPk($linkProps[1]);
				$model->link($linkModel);
			}
			
		} else { // model was not saved
			$response['success'] = false;
			//can't use <br /> tags in response because this goes wrong with the extjs fileupload hack with an iframe.
			$response['feedback'] = sprintf(GO::t('validationErrorsFound'), strtolower($model->localizedName)) . "\n\n" . implode("\n", $model->getValidationErrors()) . "\n";
			if (GO_Base_Util_Http::isAjaxRequest(false)) {
				$response['feedback'] = nl2br($response['feedback']);
			}
			$response['validationErrors'] = $model->getValidationErrors();
		}
		
		$this->fireEvent('submit', array(
					&$this,
					&$response,
					&$model
			));

		return new GO_Base_Data_JsonResponse($response);
	}

	/**
	 * Renders DbStore object to a valid JSON response
	 * @param GO_Base_Date_JsonStore $store I JsonStore object to get JSON from
	 * @deprecated boolean $return still here for buttonParams (should button params be set in DbStore
	 * @param mixed $buttonParams ???
	 * @return GO_Base_Data_JsonResponse Response object
	 */
	public function renderStore(GO_Base_Data_AbstractStore $store, $return = false, $buttonParams=false) {

//		$response = array(
//				"success" => true,
//				"results" => $store->getRecords(),
//				'total' => $store->getTotal()
//		);
//		if($summary = $store->getSummary())
//			$response['summary'] = $summary;
		
		$response=$store->getData();

		$title = $store->getTitle();
		if (!empty($title))
			$response['title'] = $title;

//		if ($store instanceof GO_Base_Data_DbStore) {
//			if ($store->getDeleteSuccess() !== null) {
//				$response['deleteSuccess'] = $store->getDeleteSuccess();
//				if(!$response['deleteSuccess'])
//					$response['deleteFeedback'] = $store->getFeedBack();
//			}
//			if($buttonParams){
//				$buttonParams = $store->getButtonParams();
//				if (!empty($buttonParams))
//					$response['buttonParams'] = $buttonParams;
//			}
//		}

		return new GO_Base_Data_JsonResponse($response);
	}
	
	/**
	 * 
	 * @param GO_Base_Data_AbstractStore $store
	 * @param type $params
	 */
	protected function renderExport(GO_Base_Data_AbstractStore $store, $params) {
		//define('EXPORTING', true);
		//used by custom fields to format diffently
		if(GO::modules()->customfields)
			GO_Customfields_Model_AbstractCustomFieldsRecord::$formatForExport=true;
		
		$checkboxSettings = array(
			'export_include_headers'=>!empty($params['includeHeaders']),
			'export_human_headers'=>empty($params['humanHeaders']),
			'export_include_hidden'=>!empty($params['includeHidden'])
		);
		
		$settings =  GO_Base_Export_Settings::load();
		$settings->saveFromArray($checkboxSettings);
		
		if(!empty($params['exportOrientation']) && ($params['exportOrientation']=="H"))
			$orientation = 'L'; // Set the orientation to Landscape
		else
			$orientation = 'P'; // Set the orientation to Portrait
		
		
		if(!empty($params['columns'])) {
			$columnModel = $store->getColumnModel();
			$includeColumns = explode(',',$params['columns']);
			foreach($includeColumns as $incColumn){
				if(!$columnModel->getColumn($incColumn))
					$columnModel->addColumn (new GO_Base_Data_Column($incColumn,$incColumn));
			}
				
			$columnModel->sort($includeColumns);
			
			foreach($columnModel->getColumns() as $c){
				if(!in_array($c->getDataIndex(), $includeColumns))
					$columnModel->removeColumn($c->getDataIndex());
			}
		}
		
		if(!empty($params['type'])){
			//temporary fix for compatibility with AbsractModelController
			$params['type']=str_replace('GO_Base_Export', 'GO_Base_Storeexport', $params['type']);
			$export = new $params['type']($store, $settings->export_include_headers, $settings->export_human_headers, $params['documentTitle'], $orientation);
		}else
			$export = new GO_Base_Storeexport_ExportCSV($store, $settings->export_include_headers, $settings->export_human_headers, $params['documentTitle'], $orientation); // The default Export is the CSV outputter.

		if(isset($params['extraLines']))
			$export->addLines($params['extraLines']);
		
		$export->output();
	}

	public function run($action = '', $params = array(), $render = true, $checkPermissions = true) {
		if (empty($action))
			$action = $this->defaultAction;

//		$this->fireEvent($action, array(
//			&$this,
//			&$params
//		));

		$response = parent::run($action, $params, $render, $checkPermissions);

		if (isset($params['firstRun']) && is_array($params['firstRun'])) {
			$response = array_merge($response, $params['firstRun']);
		}

		return $response;
	}

	/**
	 * Adds remoteComboTexts array to response
	 * Will be called in renderLoad()
	 * @param array $response the response data
	 * @return string modified response data
	 * @throws Exception if no valid key defined
	 */
	private function _loadComboTexts($model, $combofields, $response) {

		$response['remoteComboTexts'] = array();

		$oldLevel = error_reporting(E_ERROR); //suppress errors in the eval'd code

		foreach ($combofields as $property => $map) {
			if (is_numeric($property))
				throw new Exception("remoteComboFields() must return a key=>value array.");

			$value = '';
			$eval = '$value = ' . $map . ';';
			eval($eval);

			$response['remoteComboTexts'][$property] = $value;

			//hack for comboboxes displaying 0 instead of the emptyText in extjs
			if (isset($response['data'][$property]) && $response['data'][$property] === 0)
				$response['data'][$property] = "";
		}

		error_reporting($oldLevel);

		return $response;
	}

	/**
	 * 
	 * Below follow all process display functions
	 * 
	 */
	private function _processWorkflowDisplay($model, $response) {

		$response['data']['workflow'] = array();

		$workflowModelstmnt = GO_Workflow_Model_Model::model()->findByAttributes(array("model_id" => $model->id, "model_type_id" => $model->modelTypeId()));

		while ($workflowModel = $workflowModelstmnt->fetch()) {

			$currentStep = $workflowModel->step;

			$workflowResponse = $workflowModel->getAttributes('html');

//			$workflowResponse['id'] = $workflowModel->id;
			$workflowResponse['process_name'] = $workflowModel->process->name;
//			$workflowResponse['due_time'] = $workflowModel->due_time;
//			$workflowResponse['shift_due_time'] = $workflowModel->shift_due_time;			

			$workflowResponse['user'] = !empty($workflowModel->user_id) ? $workflowModel->user->name : '';

			$workflowResponse['approvers'] = array();
			$workflowResponse['approver_groups'] = array();
			$workflowResponse['step_id'] = $workflowModel->step_id;

			if ($workflowModel->step_id == '-1') {
				$workflowResponse['step_progress'] = '';
				$workflowResponse['step_name'] = GO::t('complete', 'workflow');
				$workflowResponse['is_approver'] = false;
				$workflowResponse['step_all_must_approve'] = false;
			} else {
				$workflowResponse['step_progress'] = $workflowModel->getStepProgress();
				$workflowResponse['step_name'] = $currentStep->name;
				$workflowResponse['step_all_must_approve'] = $currentStep->all_must_approve;

				$is_approver = GO_Workflow_Model_RequiredApprover::model()->findByPk(array("user_id" => GO::user()->id, "process_model_id" => $workflowModel->id, "approved" => false));

				if ($is_approver)
					$workflowResponse['is_approver'] = true;
				else
					$workflowResponse['is_approver'] = false;

				// Add the approvers of the current step to the response
				$approversStmnt = $workflowModel->requiredApprovers;

				while ($approver = $approversStmnt->fetch()) {
					$approver_hasapproved = $currentStep->hasApproved($workflowModel->id, $approver->id);
					$workflowResponse['approvers'][] = array('name' => $approver->name, 'approved' => $approver_hasapproved, 'last' => '0');
				}
				// Set the last flag for the latest approver in the list
				$i = count($workflowResponse['approvers']) - 1;

				if ($i >= 0)
					$workflowResponse['approvers'][$i]['last'] = "1";

				// Add the approver groups of the current step to the response
				$approverGroupsStmnt = $currentStep->approverGroups;
				while ($approverGroup = $approverGroupsStmnt->fetch()) {
					$workflowResponse['approver_groups'][] = array('name' => $approverGroup->name);
				}
			}

			$workflowResponse['history'] = array();
			$historiesStmnt = GO_Workflow_Model_StepHistory::model()->findByAttribute('process_model_id', $workflowModel->id, GO_Base_Db_FindParams::newInstance()->select('t.*')->order('ctime', 'DESC'));
			while ($history = $historiesStmnt->fetch()) {
				GO_Base_Db_ActiveRecord::$attributeOutputMode = 'html';


				if ($history->step_id == '-1')
					$step_name = GO::t('complete', 'workflow');
				else
					$step_name = $history->step->name;

				$workflowResponse['history'][] = array(
						'history_id' => $history->id,
						'step_name' => $step_name,
						'approver' => $history->user->name,
						'ctime' => $history->ctime,
						'comment' => $history->comment,
						'status' => $history->status ? "1" : "0",
						'status_name' => $history->status ? GO::t('approved', 'workflow') : GO::t('declined', 'workflow')
				);

				GO_Base_Db_ActiveRecord::$attributeOutputMode = 'raw';
			}

			$response['data']['workflow'][] = $workflowResponse;
		}

		return $response;
	}

	private function _processCustomFieldsDisplay($model, $response) {
		$customAttributes = $model->customfieldsRecord->getAttributes('html');

		//Get all field models and build an array of categories with their
		//fields for display.

		$findParams = GO_Base_Db_FindParams::newInstance()
						->order(array('category.sort_index', 't.sort_index'), array('ASC', 'ASC'));
		$findParams->getCriteria()
						->addCondition('extends_model', $model->customfieldsRecord->extendsModel(), '=', 'category');

		$stmt = GO_Customfields_Model_Field::model()->find($findParams);

		$categories = array();

		while ($field = $stmt->fetch()) {
			if (!isset($categories[$field->category_id])) {
				$categories[$field->category->id]['id'] = $field->category->id;
				$categories[$field->category->id]['name'] = $field->category->name;
				$categories[$field->category->id]['fields'] = array();
			}
			if (!empty($customAttributes[$field->columnName()])) {
				if ($field->datatype == "GO_Customfields_Customfieldtype_Heading") {
					$header = array('name' => $field->name, 'value' => $customAttributes[$field->columnName()]);
				}
				if (!empty($header)) {
					$categories[$field->category->id]['fields'][] = $header;
					$header = null;
				}
				$categories[$field->category->id]['fields'][] = array(
						'name' => $field->name,
						'datatype'=>$field->datatype,
						'value' => $customAttributes[$field->columnName()]
				);
			}
		}

		foreach ($categories as $category) {
			if (count($category['fields']))
				$response['data']['customfields'][] = $category;
		}
		
		if(isset($response['data']['customfields']) && method_exists($model, 'getDisabledCustomFieldsCategoriesField') && GO_Customfields_Model_DisableCategories::isEnabled($model->className(), $model->disabledCustomFieldsCategoriesField)){

			$ids = GO_Customfields_Model_EnabledCategory::model()->getEnabledIds($model->className(), $model->getDisabledCustomFieldsCategoriesField());
			
			$enabled = array();
			foreach($response['data']['customfields'] as $cat){
				if(in_array($cat['id'], $ids)){
					$enabled[]=$cat;
				}
			}
			$response['data']['customfields']=$enabled;

		}

		return $response;
	}

	private function _processFilesDisplay($model, $response) {
		if (isset(GO::modules()->files) && $model->hasFiles() && $response['data']['files_folder_id'] > 0) {

			$fc = new GO_Files_Controller_Folder();
			$listResponse = $fc->run("list", array('skip_fs_sync'=>true, 'folder_id' => $response['data']['files_folder_id'], "limit" => 20, "sort" => 'mtime', "dir" => 'DESC'), false);
			$response['data']['files'] = $listResponse['results'];
		} else {
			$response['data']['files'] = array();
		}
		return $response;
	}

	private function _processLinksDisplay($model, $response) {
		$findParams = GO_Base_Db_FindParams::newInstance()
						->limit(15);

		$ignoreModelTypes = array();
		if (GO::modules()->calendar)
			$ignoreModelTypes[] = GO_Calendar_Model_Event::model()->modelTypeId();
		if (GO::modules()->tasks)
			$ignoreModelTypes[] = GO_Tasks_Model_Task::model()->modelTypeId();

		$findParams->getCriteria()->addInCondition('model_type_id', $ignoreModelTypes, 't', true, true);

		$stmt = GO_Base_Model_SearchCacheRecord::model()->findLinks($model, $findParams);

		$store = GO_Base_Data_Store::newInstance(GO_Base_Model_SearchCacheRecord::model());
		$store->setStatement($stmt);

		$columnModel = $store->getColumnModel();
		$columnModel->formatColumn('link_count', 'GO::getModel($model->model_name)->countLinks($model->model_id)');
		$columnModel->formatColumn('link_description', '$model->link_description');

		$data = $store->getData();
		$response['data']['links'] = $data['results'];

		return $response;
	}

	private function _processEventsDisplay($model, $response) {
		$startOfDay = GO_Base_Util_Date::clear_time(time());

		$findParams = GO_Base_Db_FindParams::newInstance()->order('start_time', 'DESC');
		$findParams->getCriteria()->addCondition('start_time', $startOfDay, '>=');

		$stmt = GO_Calendar_Model_Event::model()->findLinks($model, $findParams);

		$store = GO_Base_Data_Store::newInstance(GO_Calendar_Model_Event::model());
		$store->setStatement($stmt);

		$columnModel = $store->getColumnModel();
		$columnModel->formatColumn('calendar_name', '$model->calendar->name');
		$columnModel->formatColumn('link_count', '$model->countLinks()');
		$columnModel->formatColumn('link_description', '$model->link_description');

		$data = $store->getData();
		$response['data']['events'] = $data['results'];

		return $response;
	}

	private function _processCommentsDisplay($model, $response) {
		$stmt = GO_Comments_Model_Comment::model()->find(GO_Base_Db_FindParams::newInstance()
										->limit(5)
										->select('t.*,cat.name AS categoryName')
										->order('id', 'DESC')
										->joinModel(array(
												'model' => 'GO_Comments_Model_Category',
												'localTableAlias' => 't',
												'localField' => 'category_id',
												'foreignField' => 'id',
												'tableAlias' => 'cat',
												'type' => 'LEFT'
										))
										->criteria(GO_Base_Db_FindCriteria::newInstance()
														->addModel(GO_Comments_Model_Comment::model())
														->addCondition('model_id', $model->id)
														->addCondition('model_type_id', $model->modelTypeId())
										));

		$store = GO_Base_Data_Store::newInstance(GO_Comments_Model_Comment::model());
		$store->setStatement($stmt);

		$columnModel = $store->getColumnModel();
		$columnModel->formatColumn('user_name', '$model->user->name');

		$data = $store->getData();
		foreach ($data['results'] as $k => $v) {
			$data['results'][$k]['categoryName'] = !empty($v['categoryName']) ? $v['categoryName'] : GO::t('noCategory', 'comments');
		}
		$response['data']['comments'] = $data['results'];

		return $response;
	}

	private function _processTasksDisplay($model, $response) {
		//$startOfDay = GO_Base_Util_Date::clear_time(time());

		$findParams = GO_Base_Db_FindParams::newInstance()->order('due_time', 'DESC');
		//$findParams->getCriteria()->addCondition('start_time', $startOfDay, '<=')->addCondition('status', GO_Tasks_Model_Task::STATUS_COMPLETED, '!=');						

		$stmt = GO_Tasks_Model_Task::model()->findLinks($model, $findParams);

		$store = GO_Base_Data_Store::newInstance(GO_Tasks_Model_Task::model());
		$store->setStatement($stmt);

		$store->getColumnModel()
						->setFormatRecordFunction(array($this, 'formatTaskLinkRecord'))
						->formatColumn('late', '$model->due_time<time() ? 1 : 0;')
						->formatColumn('tasklist_name', '$model->tasklist->name')
						->formatColumn('link_count', '$model->countLinks()')
						->formatColumn('link_description', '$model->link_description');

		$data = $store->getData();
		$response['data']['tasks'] = $data['results'];

		return $response;
	}

	public function formatTaskLinkRecord($record, $model, $cm) {

		$statuses = GO::t('statuses', 'tasks');

		$record['status'] = $statuses[$model->status];

		if ($model->percentage_complete > 0 && $model->status != 'COMPLETED')
			$record['status'].= ' (' . $model->percentage_complete . '%)';

		return $record;
	}

}