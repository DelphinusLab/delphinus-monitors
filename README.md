# How To Use Supervisor

[Supervisor](https://github.com/Supervisor/supervisor) is a client/server system that allows its users to monitor and control a number of processes on UNIX-like operating systems. We use supervisor to monitor process.

The server piece of supervisor is named **supervisord**.  It is responsible for starting child programs at its own invocation, responding to commands from clients, restarting crashed or exited subprocesseses, logging its subprocess stdout and stderr output, and generating and handling “events” corresponding to points in subprocess lifetimes.

Here we take Ubuntu for example, you can get more info [here](http://supervisord.org/).

## Install supervisord:

```bash
# install Supervisord
sudo apt-get install -y supervisor

```

## Configuration

Configuration files of supervisord is in `/etc/supervisor`.  If we look at the configuration file `/etc/supervisord/supervisord.conf`, we'll see at the following at the bottom:

```
[include]
files = /etc/supervisor/conf.d/*.conf
```
It means any files found in `/etc/supervisor/conf.d/` and ending in `.conf` will be included.

Create a configuration at `/etc/supervisor/conf.d/webhooks.conf`:

```
[program:nodehook]
command=/usr/bin/node /srv/http.js
directory=/srv
autostart=true
autorestart=true
startretries=3
stderr_logfile=/var/log/webhook/nodehook.err.log
stdout_logfile=/var/log/webhook/nodehook.out.log
user=www-data
environment=SECRET_PASSPHRASE='this is secret',SECRET_TWO='another secret'
```

You can copy `webhook.conf` in the direcrtory of `README.md` to "/etc/supervisor/conf.d/".

1. [program:nodehook] - Define the program to monitor. We'll call it "nodehook".
2. command - This is the command to run that kicks off the monitored process. We use "node" and run the "http.js" file. If you needed to pass any command line arguments or other data, you could do so here.
3. directory - Set a directory for Supervisord to "cd" into for before running the process, useful for cases where the process assumes a directory structure relative to the location of the executed script.
4. autostart - Setting this "true" means the process will start when Supervisord starts (essentially on system boot).
5. autorestart - If this is "true", the program will be restarted if it exits unexpectedly.
6. startretries - The number of retries to do before the process is considered "failed"
7. stderr_logfile - The file to write any errors output.
8. stdout_logfile - The file to write any regular output.
9. user - The user the process is run as.
10. environment - Environment variables to pass to the process.

Supervisord won't create a directory for logs if they do not exist; We need to create them before running Supervisord:

```
sudo mkdir /var/log/webhook
```

## Web Interface

Inside of `/etc/supervisord.conf`, add this to configure a web interface in which there are all process being monitored and we can restart, stop, clear logs and check output on process:

```
[inet_http_server]
port = 9001
username = user # username
password = pass # password

```
You can copy `supervisord.conf` in the directory of `README.md` to overwrite `/etc/supervisor/supervisord.conf`.

Access the server in a web browser at port 9001, we'll see a web interface. Click the process name ("nodehook" in this case) will show the logs for that process.

The interface asks you for a username and a password. In this case, enter "user" and "pass" to the input boxes.

## Run Locally

```bash
# start supervisor as a service
sudo service supervisor start
# Now that we've configured Supervisord to monitor process, we can read the configuration in and then reload Supervisord, using the "supervisorctl" tool:
supervisorctl reread
supervisorctl update
# running process; the command will enter into a console
supervisorctl
```
In the console of supervisorctl:

Start nodehook process:

```bash
start nodehook
```

Stop nodehook:

```bash
stop nodehook
```

Use <ctrl+c> or type "exit" to get out of the supervisorctl tool.

You can also use theses commands in terminal(**Not in supervisorctl console**):

```bash
supervisorctl start nodebook
supervisorctl stop nodebook
```
Enter `localhost:9001` in a browser to access the server. Enter the username and the password to the web interface. Switch to root account may help solving problems when you run the commands above.

