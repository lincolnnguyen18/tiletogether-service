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
* `git checkout main`

If you are working on a new feature, create a new branch off of `main` and name it after your feature, eg. `setup-repo-ci-cd`, by running
* `git checkout -b setup-repo-ci-cd`
* `git push -u origin setup-repo-ci-cd`

Make your commits to this branch until your feature is complete (remember to add tests)

You can edit a message located on any commit of your feature branch by running
* `git rebase -i HEAD~<number of commits you want to edit>`
* Change `pick` to `reword` or `r` for the commits you want to edit
* Save and exit
* An editor will open for each of the commits you want to edit, edit and save for each commit

Once you are ready to have your code reviewed, if you have more than one commit in your feature branch, squash all the commits on your feature branch into one commit by running
* `git fetch` to get the latest commits from the remote
* `git rebase -i main` while being checked out on your feature branch
* Change `pick` to `squash` or `s` for all commits but the first one
* Save and exit
* Resolve any merge conflicts
* View merge conflicts with `git status`, they are in the form of `both modified: <file>` under `Unmerged paths`
* Open each file with merge conflicts, resolve them, and run `git add <file>`
* Once all merge conflicts are resolved, run `git rebase --continue`
* An editor will open to let you write your commit message
* Title the commit with the feature you are working on, e.g. `Setup repo CI/CD`
* Add a summary of your changes if necessary
* Save and exit

Push your changes to your feature branch on GitHub by running
* `git push` or `git push -f` if you have squashed commits (revisions)

Finally, create a pull request on GitHub from your feature branch to the `main` branch using the website.
* Go to the repository on GitHub
* Go to your feature branch
* Open a pull request to `main`
* The PR should say `Able to merge. These branches can be automatically merged.`
* Scroll down and review your changes
* Keep the default title (should be the name of your feature branch and a link to the PR in the form of `#<PR number>`)
* Add a description of your changes if necessary
* Choose one person on the team to review your PR
* Assign yourself as the assignee
* Select `tiletogether-service`  as the project
* Select `Add APIs to tile-together service` as the milestone
* Click on the green `Create pull request` button

For each revision of your PR in response to feedback, put your changes in an additional commit on your feature branch
* Name the additional commit with the feature you are working on and the revision number (starting from revision 1), e.g. `Setup repo CI/CD (revision 1)`
* Push your changes to your feature branch on GitHub by running `git push`
* Notify the reviewer that you have made changes to your PR

Occasionally rebase onto the latest commit of the `main` branch to keep your feature branch up to date
* `git fetch` to get the latest commits from the remote
* `git checkout main` and `git pull` to get the latest commits from the remote for the `main` branch
* `git checkout <feature-branch-name>` to go back to your feature branch
* `git rebase main` while being checked out on your feature branch's latest revision
* Resolve any merge conflicts

Once your PR has been approved
* Make sure GitHub says `able to merge`, if not rebase onto the latest commit of the `main` branch

Once GitHub says `able to merge`, merge your PR's feature branch into the `main` branch by running
* `git checkout main`
* `git pull` to make sure you are on the latest commit of the `main` branch
* `git merge --squash <feature-branch-name>` to squash all the commits on your feature branch into one commit on the `main` branch
* Make sure the title of the commit is the name of your feature branch with the PR number in the form of `#<PR number>`, e.g. `Setup repo CI/CD #1`
* Add a description of your changes if necessary
* Merge the PR
* Delete your feature branch by running `git checkout main`, `git branch -d <feature-name>` and `git push origin --delete <feature-name>`
