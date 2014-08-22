<?php

/**
 * Copyright Intermesh
 *
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 *
 * If you have questions write an e-mail to info@intermesh.nl
 *
 * @version $Id: CronJob.php 7607 2011-06-15 09:17:42Z wsmits $
 * @copyright Copyright Intermesh
 * @author Wesley Smits <wsmits@intermesh.nl>
 */

/**
 * The CronJob model
 * 
 * @property int $id
 * @property string $name
 * @property int $active
 * @property int $runonce
 * @property string $minutes
 * @property string $hours
 * @property string $monthdays
 * @property string $months
 * @property string $weekdays
 * @property string $years
 * @property string $job
 * @property string $params
 * @property int $nextrun // timestamp of the next run
 * @property int $lastrun // timestamp of the latest run
 * @property int $completedat // timestamp of the latest run
 * 
 */
class GO_Base_Cron_CronJob extends GO_Base_Db_ActiveRecord {
		
	public $paramsToSet = array();
	
	
	/**
	 * Returns a static model of itself
	 * 
	 * @param String $className
	 * @return GO_Notes_Model_Note 
	 */
	public static function model($className=__CLASS__)
	{	
		return parent::model($className);
	}
	
	public function isRunning(){
		if($this->lastrun > 0 && $this->completedat == 0)
			return true;
//		if($this->completedat == 0)
//			return false;
		else
			return $this->lastrun > $this->completedat;
	}
	
	protected function init() {
		$this->columns['name']['unique']=true;
		$this->columns['nextrun']['gotype']='unixtimestamp';
		$this->columns['lastrun']['gotype']='unixtimestamp';
		$this->columns['completedat']['gotype']='unixtimestamp';
		return parent::init();
	}
	
	public function tableName(){
		return 'go_cron';
	}
	
	public function primaryKey() {
		return 'id';
	}
	
	public function relations() {
		return array(
				'users' => array('type'=>self::MANY_MANY, 'model'=>'GO_Base_Model_User', 'field'=>'cronjob_id', 'linkModel' => 'GO_Base_Cron_CronUser'),
				'groups' => array('type'=>self::MANY_MANY, 'model'=>'GO_Base_Model_Group', 'field'=>'cronjob_id', 'linkModel' => 'GO_Base_Cron_CronGroup'),
		);
	}
	
	/**
	 * TODO: IMPLEMENT AND RETURN THE STATEMENT
	 * @return GO_Base_Db_ActiveStatement $stmnt
	 */
	public function getAllUsers(){
		
		$id = $this->id;
		
		$query = "SELECT * FROM `go_users` as `t`
							WHERE `id` IN (
								SELECT `id` FROM `go_cron_users` cu 
								WHERE user_id=`t`.`id` AND `cu`.`cronjob_id`=:cronjob_id
							)
							OR `id` IN (
								SELECT `ug`.`user_id` FROM `go_cron_groups` cg 
								INNER JOIN `go_users_groups` ug ON `ug`.`group_id`=`cg`.`group_id`
								WHERE `cg`.`cronjob_id`=:cronjob_id
							);";
		$stmnt = GO::getDbConnection()->prepare($query);
		$stmnt->bindParam("cronjob_id", $id, PDO::PARAM_INT);
		$stmnt->execute();

		$stmnt->setFetchMode(PDO::FETCH_CLASS, "GO_Base_Model_User",array(false));
		
		return $stmnt;
	}
	
	
	/**
	 * Validate the inputfields
	 * 
	 * @return boolean
	 */
	public function validate() {
		
		if(!$this->_validateExpression('minutes'))
			$this->setValidationError('minutes', GO::t('minutesNotMatch','cron'));
		
		if(!$this->_validateExpression('hours'))
			$this->setValidationError('hours', GO::t('hoursNotMatch','cron'));
		
		if(!$this->_validateExpression('monthdays'))
			$this->setValidationError('monthdays', GO::t('monthdaysNotMatch','cron'));
		
		if(!$this->_validateExpression('months'))
			$this->setValidationError('months', GO::t('monthsNotMatch','cron'));
		
		if(!$this->_validateExpression('weekdays'))
			$this->setValidationError('weekdays', GO::t('weekdaysNotMatch','cron'));
		
		if(!$this->_validateExpression('years'))
			$this->setValidationError('years', GO::t('yearsNotMatch','cron'));
		
		if($this->hasValidationErrors())
			$this->setValidationError('active', '<br /><br />'.$this->_getExampleFormats());

		return parent::validate();
	}
	
	/**
	 * Function for creating the pattern for checking the correct values
	 * 
	 *		*
	 *		0,10
	 *		* /5
	 *		1,3,5
	 *		1-5
	 * 
	 * 
	 * @var string $field
	 * @return string The regular expression
	 */
	private function _getValidationRegex($field){
		$regex = '/';
		switch($field){
			case 'minutes':
				$regex .= '([0-6][0-9]?[- ]?|\*)*,*';
				break;
			case 'hours':
				$regex .= '([0-2][0-9]?[- ]?|\*)*,*';
				break;
			case 'monthdays':
				$regex .= '([1-3][0-9]?[- ]?|\*)*,*';
				break;
			case 'months':
				$regex .= '([1-9][0-9]?[- ]?|\*)*,*';
				break;
			case 'weekdays':
				$regex .= '([0-6][- ]?|\*)*,*';
				break;
			case 'years':
				$regex .= '(([1-9][0-9]{3}[- ]?|\*)*),*';
				break;
		}
		$regex .= '/';
		
		return $regex;
	}
		
	private function _validateExpression($field){
			
		if($this->{$field} == '')
			return false;
		
		return preg_match($this->_getValidationRegex($field), $this->{$field});
	}
	
	private function _getExampleFormats(){
		return GO::t('exampleFormats','cron').
			'<table>'.
				'<tr><td>*</td><td>'.GO::t('exampleFormat1Explanation','cron').'</td></tr>'.
				'<tr><td>1</td><td>'.GO::t('exampleFormat2Explanation','cron').'</td></tr>'.
				'<tr><td>1-5</td><td>'.GO::t('exampleFormat3Explanation','cron').'</td></tr>'.
				'<tr><td>0-23/2</td><td>'.GO::t('exampleFormat4Explanation','cron').'</td></tr>'.
				'<tr><td>1,2,3,13,22</td><td>'.GO::t('exampleFormat5Explanation','cron').'</td></tr>'.
				'<tr><td>0-4,8-12</td><td>'.GO::t('exampleFormat6Explanation','cron').'</td></tr>'.
			'<table>';
	}
	
	/**
	 * Build the cron expresssion from the attributes of this model 
	 * 
	 * *    *    *    *    *		 *
   * -    -    -    -    -    -
   * |    |    |    |    |    |
   * |    |    |    |    |    + year [optional]
   * |    |    |    |    +----- day of week (0 - 7) (Sunday=0 or 7)
   * |    |    |    +---------- month (1 - 12)
   * |    |    +--------------- day of month (1 - 31)
   * |    +-------------------- hour (0 - 23)
   * +------------------------- min (0 - 59)
	 *	
	 * 
	 * @return string The complete expression 
	 */
	private function _buildExpression(){
		$expression = '';
	
		$expression .= $this->minutes;
		$expression .= ' ';
		$expression .= $this->hours;
		$expression .= ' ';
		$expression .= $this->monthdays;
		$expression .= ' ';
		$expression .= $this->months;
		$expression .= ' ';
		$expression .= $this->weekdays;
		$expression .= ' ';
		$expression .= $this->years;
	
		return $expression;
	}
	
	public function formatInput($column, $value) {
		$value=trim($value);
		return parent::formatInput($column, $value);
	}
	
	/**
	 * Function to calculate the next running time for this cronjob
	 * 
	 * @return int The next run time (timestamp)
	 */
	private function _calculateNextRun(){
		$completeExpression = new GO_Base_Util_Cron($this->_buildExpression());
		return $completeExpression->getNextRunDate()->getTimestamp();
	}
	
	public function run(){
		GO::session()->runAsRoot();
		GO::debug('CRONJOB ('.$this->name.') START : '.date('d-m-Y H:i:s'));
		
		if($this->_prepareRun()){
			if(!class_exists($this->job)){
				GO::debug('Abort because cron job class file is missing');
				return false;
			}
			// Run the specified cron file code
			$cronFile = new $this->job;
			
			//$cronFile->setParams();
			
			if($cronFile->enableUserAndGroupSupport()){
				
				$stmnt = $this->getAllUsers();
				foreach($stmnt as $user){
					GO::language()->setLanguage($user->language); // Set the users language
					
					GO::debug('CRONJOB ('.$this->name.') START FOR '.$user->username.' : '.date('d-m-Y H:i:s'));
					$cronFile->run($this,$user);
					GO::debug('CRONJOB ('.$this->name.') FINSIHED FOR '.$user->username.' : '.date('d-m-Y H:i:s'));
					
					GO::language()->setLanguage(); // Set the admin language
				}
			} else {
				$cronFile->run($this);
			}
			
			$this->_finishRun();
	
			return true;
		} else {
			GO::debug('CRONJOB ('.$this->name.') FAILED TO RUN : '.date('d-m-Y H:i:s'));
			return false;
		}
	}
	
	
	protected function beforeSave() {
		
//		$this->params = $this->_paramsToJson();
		
		$this->nextrun = $this->_calculateNextRun();
		GO::debug('CRONJOB ('.$this->name.') NEXTRUN : '.$this->getAttribute('nextrun','formatted'));
		return parent::beforeSave();
	}
	
	
	
//	protected function afterLoad() {
//		$this->paramsToSet = $this->_jsonToParams($this->params);
//		return parent::afterLoad();
//	}
	
//	/**
//	 * Convert the PUBLIC parameters of this object to a Json string
//	 * ($this->params)
//	 * 
//	 * @return string
//	 */
//	private function _paramsToJson(){
//		$propArray = array();
//
//		$publicProperties = $this->_getAdditionalJobProperties();
//		
//		foreach($publicProperties as $property){
//			
//			if(isset($this->paramsToSet) && key_exists($property['name'],$this->paramsToSet))
//				$propArray[$property['name']] = $this->paramsToSet[$property['name']];
//		}
//		
//		return json_encode($propArray);
//	}
	
	private function _getAdditionalJobProperties(){
		
		$returnProperties = array();
		
		$jobReflection = new ReflectionClass($this->job);
		$parentReflection = $jobReflection->getParentClass();

		$jobProperties = $jobReflection->getProperties(ReflectionProperty::IS_PUBLIC);
		$parentProperties = $parentReflection->getProperties(ReflectionProperty::IS_PUBLIC);
		
		$publicProperties = array_diff($jobProperties, $parentProperties);
		
		$defaultProperties = $jobReflection->getDefaultProperties();

		foreach($publicProperties as $property){
	
			$returnProperties[] = array(
				'name'=>$property->name,
				'defaultValue'=>$defaultProperties[$property->name]
			);
		}

		return $returnProperties;
	}
	
//	/**
//	 * Convert a Json string to PUBLIC parameters of this object
//	 * ($this->params)
//	 * 
//	 * @param String $jsonString
//	 */
//	private function _jsonToParams($jsonString = ''){
//		
//		$propArray = array();
//		$jsonProperties = json_decode($jsonString);
//		$publicProperties = $this->_getAdditionalJobProperties();
// 
//		foreach($publicProperties as $property){
//			$propArray[$property['name']] = '';
//			if(!empty($jsonProperties[$property['name']])){
//				$propArray[$property['name']] = $jsonProperties[$property['name']];
//			} else {
//				if(!empty($property['defaultValue']))
//					$propArray[$property['name']] = $property['defaultValue'];
//			}
//		}
//		
//		return $propArray;
//	}
	
	/**
	 * This function needs to be called at the START of the run of this cronjob.
	 * It calculates the next run time and sets the last run time.
	 * 
	 * @return boolean
	 */
	private function _prepareRun() {
		
		$this->active = false;
		
		$this->lastrun = time();
		return $this->save();
	}
	
	private function _finishRun(){
		if(!$this->runonce){
			$this->active = true;
			GO::debug('CRONJOB ('.$this->name.') IS REACTIVATED NOW');
		} else {
			GO::debug('CRONJOB ('.$this->name.') HAS RUNONCE OPTION, DISABLING NOW');
		}
		
		$this->completedat = time();
		$this->save();
			
		GO::debug('CRONJOB ('.$this->name.') FINISHED : '.date('d-m-Y H:i:s'));
	}
	
}