pipeline {
    agent {
        label 'linux'
    }

    environment {    
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm // Checks out source code from the configured repository
            }
        }		

        stage('Build and test') {
            
            steps {
                script {        
                    sh "export CI=1"           
                    sh "npm install"
                    sh "npm test"
                }
            }
        }
    }

    post {
        always {
            // Cleanup tasks, such as archiving results, notifications, etc.
            echo "Build completed"
        }
    }
}
