<?php
class GO_Base_Cron_EmailReminders extends GO_Base_Cron_AbstractCron {
	
	/**
	 * Return true or false to enable the selection for users and groups for 
	 * this cronjob.
	 * 
	 * CAUTION: This will give the run() function a different behaviour. 
	 *					Please see the documentation of the run() function 
	 *					to see what is different.
	 */
	public function enableUserAndGroupSupport(){
		return false;
	}
	
	/**
	 * Get the unique name of the Cronjob
	 * 
	 * @return String
	 */
	public function getLabel(){
		return GO::t('cronEmailReminders','email');
	}
	
	/**
	 * Get the unique name of the Cronjob
	 * 
	 * @return String
	 */
	public function getDescription(){
		return GO::t('cronEmailRemindersDescription','email');
	}
	
	/**
	 * The code that needs to be called when the cron is running
	 * 
	 * If $this->enableUserAndGroupSupport() returns TRUE then the run function 
	 * will be called for each $user. (The $user parameter will be given)
	 * 
	 * If $this->enableUserAndGroupSupport() returns FALSE then the 
	 * $user parameter is null and the run function will be called only once.
	 * 
	 * @param GO_Base_Cron_CronJob $cronJob
	 * @param GO_Base_Model_User $user [OPTIONAL]
	 */
	public function run(GO_Base_Cron_CronJob $cronJob,GO_Base_Model_User $user = null){
		
		GO::session()->runAsRoot();
		$usersStmt = GO_Base_Model_User::model()->findByAttribute('mail_reminders', 1);
		while ($userModel = $usersStmt->fetch()) {
			
			GO::debug("Sending mail reminders to ".$userModel->username);
			
			$remindersStmt = GO_Base_Model_Reminder::model()->find(
				GO_Base_Db_FindParams::newInstance()
					->joinModel(array(
						'model' => 'GO_Base_Model_ReminderUser',
						'localTableAlias' => 't',
						'localField' => 'id',
						'foreignField' => 'reminder_id',
						'tableAlias' => 'ru'								
					))
					->criteria(
						GO_Base_Db_FindCriteria::newInstance()
							->addCondition('user_id', $userModel->id, '=', 'ru')
							->addCondition('time', time(), '<', 'ru')
							->addCondition('mail_sent', '0', '=', 'ru')
					)
			);

			while ($reminderModel = $remindersStmt->fetch()) {
//					$relatedModel = $reminderModel->getRelatedModel();

//					var_dump($relatedModel->name);

//					$modelName = $relatedModel ? $relatedModel->localizedName : GO::t('unknown');
				$subject = GO::t('reminder').': '.$reminderModel->name;

				$time = !empty($reminderModel->vtime) ? $reminderModel->vtime : $reminderModel->time;

				date_default_timezone_set($userModel->timezone);

				$body = GO::t('time').': '.date($userModel->completeDateFormat.' '.$userModel->time_format,$time)."\n";
				$body .= GO::t('name').': '.str_replace('<br />',',',$reminderModel->name)."\n";

//					date_default_timezone_set(GO::user()->timezone);

				$message = GO_Base_Mail_Message::newInstance($subject, $body);
				$message->addFrom(GO::config()->noreply_email,GO::config()->title);
				$message->addTo($userModel->email,$userModel->name);
				GO_Base_Mail_Mailer::newGoInstance()->send($message, $failedRecipients);
				
				if(!empty($failedRecipients))
					trigger_error ("Reminder mail failed for recipient: ".implode(',', $failedRecipients), E_USER_NOTICE);

				$reminderUserModelSend = GO_Base_Model_ReminderUser::model()
					->findSingleByAttributes(array(
						'user_id' => $userModel->id,
						'reminder_id' => $reminderModel->id
					));
				$reminderUserModelSend->mail_sent = 1;
				$reminderUserModelSend->save();
			}

			date_default_timezone_set(GO::user()->timezone);
		}
	}
	
}