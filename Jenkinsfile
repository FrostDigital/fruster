pipeline {
    agent {
        label 'linux'
    }

    environment {    
        CI = '1'
    }

    stages {
        stage("Verify environment") {
            steps {
                // Verify that nats-server is available and if not fail the build
                sh "nats-server -v"
            }
        }

        stage('Checkout Code') {
            steps {
                checkout scm // Checks out source code from the configured repository
            }
        }		

        stage('Build and test') {
            
            steps {
                script {        
                    sh "export CI=1"     
                    sh "npm install lerna@4"      
                    sh "npm run clean"
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
