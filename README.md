# How To Use Supervisor

[Supervisor](https://github.com/Supervisor/supervisor) is a client/server system that allows its users to monitor and control a number of processes on UNIX-like operating systems. We use supervisor to monitor process.

Note that Supervisor has been tested and is known to run on Linux (Ubuntu 18.04), Mac OS X (10.4/10.5/10.6), and Solaris (10 for Intel) and FreeBSD 6.1. It will likely work fine on most UNIX systems and will *not* run at all under any version of Windows.

Here is an introuduction to web user interface of supervisor. Go through the following:

## Install supervisord

The server piece of supervisor is named **supervisord**. It is responsible for starting child programs at its own invocation, responding to commands from clients, restarting crashed or exited subprocesseses, logging its subprocess stdout and stderr output, and generating and handling “events” corresponding to points in subprocess lifetimes.

Supervisor can be installed with `pip install`:

```bash
pip install supervisor
```

Depending on the permissions of your system’s Python, you might need to be the root user to install Supervisor successfully using  `pip`.

You can install it without `pip`，get more info [here](http://supervisord.org/installing.html).

## Configuration File

The server process supervisord uses a configuration file which is typically located in `/etc/supervisord.conf`. Keep this file secure via proper filesystem permissions because it may contain unencrypted usernames and passwords.

Run:

```
echo_supervisord_conf > supervisord.conf
```

to place the configuration file in the current directory. You can place it in `/etc` as long as you have root access.

You can simply use `supervisord.conf` in the same directory of the `README.md` which is preconfigured.

Note that you sholud change `command` in `[program:monitor]` section in `supervisord.conf`. The command will be run when supervisord is started.

If you want to configure supervisor by yourselft, visit http://supervisord.org/configuration.html.

## Run Web Server

The command-line client piece of the supervisor is named **supervisorctl**.  It provides a shell-like interface to the features provided by supervisord.  From supervisorctl, a user can connect to different supervisord processes (one at a time), get status on the subprocesses controlled by, stop and start subprocesses of, and get lists of running processes of a supervisord.

A (sparse) web user interface with functionality comparable to supervisorctl may be accessed via a browser if you start supervisord against an internet socket.

At first, you shoud find out the place in which your supervisord and supervisorctl was installed. The position depends on platforms you use. Say, run `whereis supervisord` to find out the place. You should find the place of supervisorctl in the same directory. Here we take `~/.local/bin/` according to the output of `whereis supervisord` in Ubuntu version 20.04 for example.

### Start **supervisord**

run

````
~/.local/bin/supervisord -c supervisord.conf
````

The “-c” argument after the command above specifying an absolute path to a configuration file to ensure that someone doesn’t trick you into running supervisor from within a directory that contains a rogue `supervisord.conf` file. Here use the configuration file in the same directory of `README.md`.

### Start **supervisorctl**

run

````
~/.local/bin/supervisorctl
````

A shell will be presented that will allow you to control the processes that are currently managed by supervisord. In the shell, you can run `supervisorctl stop all` to terminate the supervisord process.

### Visit the Server URL

Visit the server URL on which supervisord server is listening (default “http://localhost:9001”) to view and control process status through the web interface.

You can change the server URL via `-s` argument. See [here](http://supervisord.org/running.html#supervisorctl-command-line-options).

### An Brief Introduction To the Web Interface

The web page of the browser would ask for username and password. You can find them in the `[inet_http_server]` section in `supervisord.conf`.

In the web interface, there is a process named monitor in the table if you do not change the name of the program in `supervisord.conf`.

There are three buttons on the table:

1. REFRESH: refresh the page
2. RESTART ALL: restart all process
3. STOP ALL: terminate all process

Here is the explanation of each column in the table:

1. The 1st column is the state of the process

2. The 2nd column is the time when the process start or restart

3. The 3nd column is the name of the process, click the name to view the output of the process

4. The last column is the operation you can do. The first one is for starting the process. The second one is clear log of the process. The third one is the output of the process. The last one is the error of the process.
