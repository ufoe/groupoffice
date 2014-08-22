<?php
/*
 * Copyright Intermesh
 * 
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 * 
 * If you have questions write an e-mail to info@intermesh.nl
 */

/**
 * Thrown when a user doesn't have access
 *
 * @author Michal Charvat <mcharvat@zdeno.net>
 * @version $Id:  $
 * @copyright Copyright Intermesh
 * @package GO.base.exception
 *
 * @uses Exception
 */

class GO_Base_Exception_BadPassword extends Exception
{
	public function __construct($message = '')
	{

		$message = empty($message) ? GO::t('badPassword') : GO::t('badPassword') . "\n\n" . $message;

		parent::__construct($message);
	}
}