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

### Setup feature branch

Make sure you are checked out on the latest commit of the `main` branch
* `git checkout main`
* `git pull`

If you are working on a new feature, create a new branch off of `main` and name it after your feature, eg. `setup-repo-ci-cd`, by running
* `git checkout -b <feature-name>`
* `git push -u origin <feature-name>`

### Work on feature

Make your commits to this branch until your feature is complete (remember to add tests) by running
* `git add <file>` to add files you want to commit
* `git commit -m "<commit message>"` to commit your changes
* `git push` occasionally to back up your changes on GitHub and show your current progress to the team

You can update the latest commit without adding a new commit by running
* Run `git add <file>` to add files you want to commit
* `git commit --amend --no-edit`
* `git push -f`

Occasionally rebase onto the latest commit of the `main` branch to keep your feature branch up to date
* `git fetch` to get the latest commits from the remote
* `git checkout main` and `git pull` to get the latest commits from the remote for the `main` branch
* `git checkout <feature-branch-name>` to go back to your feature branch
* `git rebase main` while being checked out on your feature branch's latest revision
* Resolve any merge conflicts

You can edit a message located on any commit of your feature branch by running
* `git rebase -i HEAD~<number of commits you want to edit>`
* Change `pick` to `reword` or `r` for the commits you want to edit
* Save and exit
* An editor will open for each of the commits you want to edit, edit and save for each commit

### Publish PR

Once you are ready to have your code reviewed, run
* `git fetch` to get the latest commits from the remote
* `git checkout <feature-branch-name>` to make sure you are on the latest commit of your feature branch
* `git status` to make sure you have no uncommitted changes
* `git rebase -i main` while being checked out on your feature branch
* Keep the first commit (first line) as `pick` and change all other commits to `squash` or `s`
* Save and exit

If there are any merge conflicts, resolve them
* View merge conflicts with `git status`, they are in the form of `both modified: <file>` under `Unmerged paths`
* Open each file with merge conflicts, resolve them, and run `git add <file>`
* Once all merge conflicts are resolved, run `git rebase --continue`

An editor will open to let you write your commit message
* Erase everything above `# Please enter the commit message for your changes.`
* Title the commit (first line) with the feature you are working on, e.g. `Setup repo CI/CD`
* Add a summary of your changes if necessary (after first line)
* Save and exit

Push your changes to your feature branch on GitHub by running
* `git push` or `git push -f` if you have squashed commits

Finally, create a pull request on GitHub from your feature branch to the `main` branch using the website.
* Go to the repository on GitHub
* Go to your feature branch
* It should say `This branch is 1 commit ahead of main.`
* If not, squash your commits by interactively rebasing onto the latest commit of the `main` branch as described above
* Open a pull request to `main`
* The PR should say `Able to merge. These branches can be automatically merged.`
* If not, go to the "Occasionally rebase onto the latest commit of the `main` branch to keep your feature branch up-to-date" section above
* Review your code changes at the bottom of the page
* If there are any changes you want to make, `git add` the changes then `git commit --amend --no-edit` and `git push -f`; refresh the PR page and you should see your changes
* Keep the default title
* Add a description of your changes if necessary
* Choose one person on the team to review your PR
* Assign yourself as the assignee
* Select `tiletogether-service` in the `Projects` section on the right
* Select `Add APIs to tile-together service` in the `Milestones` section
* Select your item from the GitHub project board in the `Development` section
* Click on the green `Create pull request` button

### Revise PR

For each revision of your PR in response to feedback, put your changes in an additional commit on your feature branch
* Name the additional commit with the feature you are working on and the revision number (starting from revision 1), e.g. `Setup repo CI/CD (revision 1)`
* Push your revision to your feature branch on GitHub by running `git push`
* Notify the reviewer that you have made changes to your PR

### Merge PR

Once your PR has been approved
* Make sure GitHub says `able to merge`, if not, go to the "Occasionally rebase onto the latest commit of the `main` branch to keep your feature branch up-to-date" section above
* Make sure you have no uncommitted changes on your feature branch by running `git status`
* Make sure all tests have passed and GitHub says `All checks have passed`
  * You will have to wait for GitHub Actions to finish running the tests and occasionally refresh the PR page
  * Once the PR is created, these tests are run on every push to your feature branch (PR revisions)

Once GitHub says `able to merge`, merge your PR's feature branch into the `main` branch by
* Setting the green merge button to `Squash and merge` and clicking on the green `Merge pull request` button
* Keep the default title (should be the name of your feature branch and a link to the PR in the form of `#<PR number>`, e.g. `Setup repo CI/CD (#1)`)
* Add a description of your changes if necessary
* Click on the green `Confirm squash and merge` button
* GitHub should say `Pull request successfully merged and closed`
* Click on the `Delete branch` button next to it to delete your successfully merged feature branch

### Cleanup feature branch

Clean up locally by running
* `git checkout main` to leave your feature branch
* `git pull` to get the latest commits from the remote for the `main` branch
* `git branch -d <feature-branch-name>` to delete your feature branch from your local repository
* `git remote prune origin` to remove the remote branch from your local repository
* `git branch` to make sure your local and remote feature branches have been deleted
