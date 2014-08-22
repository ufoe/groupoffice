<?php
/**
 * Group-Office
 * 
 * Copyright Intermesh BV. 
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 *
 * If you have questions write an e-mail to info@intermesh.nl
 * 
 * @license AGPL/Proprietary http://www.group-office.com/LICENSE.TXT
 * @link http://www.group-office.com
 * @copyright Copyright Intermesh BV
 * @version $Id: Number.php 7962 2011-08-24 14:48:45Z mschering $
 * @author Merijn Schering <mschering@intermesh.nl>
 * @package GO.base
 */

/**
 * Base model class
 * 
 * All data models extend this class.
 * 
 * @license AGPL/Proprietary http://www.group-office.com/LICENSE.TXT
 * @link http://www.group-office.com
 * @copyright Copyright Intermesh BV
 * @version $Id: Number.php 7962 2011-08-24 14:48:45Z mschering $
 * @author Merijn Schering <mschering@intermesh.nl>
 * @package GO.base
 * @abstract
 */
abstract class GO_Base_Model extends GO_Base_Object{
	
	protected $_validationErrors = array();
	
	private static $_models=array();			// class name => model
	
	/**
	 * Returns the static model of the specified AR class.
	 * Every child of this class must override it.
	 * 
	 * @return static the static model class
	 */
	public static function model($className=null)
	{		
		if(!isset($className))
		  $className = get_called_class();
		if(isset(self::$_models[$className])){
			$model = self::$_models[$className];			
		}else
		{
			$model=self::$_models[$className]=new $className(false, true);			
		}
		return $model;
	}
	
	/**
	 * Get the name in lowercase of the module that this model belongs to.
	 * 
	 * returns 'base' if it belongs to the core library of Group-Office.
	 * 
	 * @return string 
	 */
	public function getModule(){
		$arr = explode('_', $this->className());
		
		return strtolower($arr[1]);
	}
	
	/**
	 * Returns the attribute labels.
	 *
	 * Attribute labels are mainly used for display purpose. For example, given an attribute
	 * `firstName`, we can declare a label `First Name` which is more user-friendly and can
	 * be displayed to end users.
	 *
	 * @return array attribute labels (attribute => label)
	 * @see getAttributeLabel
	 */
	protected function attributeLabels()
	{
		return array();
	}
	
	/**
	 * Returns the text label for the specified attribute.
	 * @param string $attribute the attribute name
	 * @return string the attribute label
	 * @see attributeLabels
	 */
	public function getAttributeLabel($attribute)
	{
		$labels = $this->attributeLabels();
		return isset($labels[$attribute]) ? $labels[$attribute] : ucwords(trim(strtolower(str_replace(array('-', '_', '.'), ' ', preg_replace('/(?<![A-Z])[A-Z]/', ' \0', $attribute)))));
	}
	
	/**
	 * Clears the model cache. Useful when upgrading. 
	 */
	public static function clearCache(){
		self::$_models=array();
	}
	
	/**
	 * Get the name of the model in short
	 * eg. GO_Base_Model_User will return 'User'
	 * @return string Model name
	 */
	public function getModelName()
	{
		$classParts = explode('_',get_class($this));
		return array_pop($classParts);
	}
	
	/**
	 * You can override this function to implement validation in your model.
	 * 
	 * @return boolean
	 */
	public function validate()
	{			
		return !$this->hasValidationErrors();
	}
	
	
	/**
	 * Return all validation errors of this model
	 * 
	 * @return array 
	 */
	public function getValidationErrors(){
		return $this->_validationErrors;
	}
	
	/**
	 * Get the validationError for the given attribute
	 * If the attribute has no error then fals will be returned
	 * 
	 * @param string $key
	 * @return mixed 
	 */

	public function getValidationError($key){
		$validationErrors = $this->getValidationErrors();
		if(!empty($validationErrors[$key]))
			return $validationErrors[$key];
		else
			return false;
	}
	
	/**
	 * Set a validation error for the given field.
	 * If the error key is equal to a model attribute name, the view can render 
	 * an error on the associated form field.
	 * The key for an error must be unique.
	 * 
	 * @param string $key 
	 * @param string $message 
	 */
	protected function setValidationError($key, $message) {
		$this->_validationErrors[$key] = $message;
	}
	
	/**
		* Returns a value indicating whether there is any validation error.
		* @param string $key attribute name. Use null to check all attributes.
		* @return boolean whether there is any error.
		*/
	public function hasValidationErrors($key=null)
	{
		$validationErrors = $this->getValidationErrors();
		
		if ($key === null)
			return count($validationErrors)>0;
		else
			return isset($validationErrors[$key]);
	}
	
}