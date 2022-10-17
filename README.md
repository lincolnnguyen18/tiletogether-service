# TileTogether Service

## Setup
1. Install Node.js and MongoDB
2. Make sure your Git CLI is authenticated with GitHub
3. Clone this repository
4. Run `npm install` in the root directory
5. Make sure MongoDB is running on port 27017
6. Run `npm run dev` in the root directory
7. Go to `localhost:3001/health` to see if the server is running
8. Run `npm run test` to run the tests

## Workflow

Make sure you are checked out on the latest commit of the `main` branch
If you are working on a new feature, create a new branch off of `main` and name it `<feature-name>`, eg. `setup-repo-ci-cd`, by running
1. `git checkout -b setup-repo-ci-cd`
2. `git push -u origin setup-repo-ci-cd`

Make your commits to this branch until your feature is complete (remember to add tests)

You can edit a message located on any commit of your feature branch by running
1. `git rebase -i HEAD~<number of commits you want to edit>`
2. Change `pick` to `reword` or `r` for the commits you want to edit
3. Save and exit
4. An editor will open for each of the commits you want to edit, edit and save for each commit

Once you are ready to have your code reviewed, if you have more than one commit in your feature branch, squash all the commits on your feature branch into one commit by running
1. `git rebase -i main`
2. Change `pick` to `squash` or `s` for all the commits you want to squash while keeping the first commit as `pick`
3. Save and exit
4. An editor will open combining all the commit messages, remove all the messages
5. Title the commit with the feature you are working on, e.g. `Setup repo CI/CD`
6. Add a summary of your changes if necessary
7. Save and exit

Push your changes to your feature branch on GitHub by running
1. `git push` or `git push -f` if you have squashed commits

Finally, create a pull request on GitHub from your feature branch to the `main` branch using the website.
1. Go to the repository on GitHub
2. Go to your feature branch
3. Click on the green `Compare & pull request` button
4. Scroll down and review your changes
5. Keep the default title (should be the name of your feature branch and a link to the PR in the form of `#<PR number>`)
6. Add a description of your changes if necessary
7. Choose one person on the team to review your PR
8. Assign yourself as the assignee
9. Select `tiletogether-service`  as the project
10. Select `Add APIs to tile-together service` as the milestone
11. Click on the green `Create pull request` button

For each revision of your PR in response to feedback, put your changes in an additional commit on your feature branch
1. Name the additional commit with the feature you are working on and the revision number (starting from revision 1), e.g. `Setup repo CI/CD (revision 1)`
2. Push your changes to your feature branch on GitHub by running `git push`
3. Notify the reviewer that you have made changes to your PR

Once your PR has been approved, merge it into the `main` branch by running
1. `git checkout main`
2. `git pull` to make sure you are on the latest commit of the `main` branch
3. `git merge --squash <feature-branch-name>` to squash all the commits on your feature branch into one commit on the `main` branch
3. Make sure the title of the commit is the name of your feature branch with the PR number in the form of `#<PR number>`, e.g. `Setup repo CI/CD #1`
5. Add a description of your changes if necessary
7. Merge the PR
8. Delete your feature branch by running `git checkout main`, `git branch -d <feature-name>` and `git push origin --delete <feature-name>`

