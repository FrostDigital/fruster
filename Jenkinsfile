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
                    sh "corepack enable"
                    sh "corepack prepare pnpm@10.27.0 --activate"
                    sh "pnpm install --frozen-lockfile"
                    sh "pnpm test"
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
