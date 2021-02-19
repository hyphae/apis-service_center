# apis-service_center

## Introduction

Service Center is a Web application that provides information required by the administrators and users of clusters constructed of apis-main services installed in each unit. For administrators, the status and energy sharing information for each unit that is needed mainly for operation is displayed in real time. The energy sharing history, notifications of abnormalities, and availability ratio for each unit are also provided. For users, the status and energy sharing information for the user’s units are displayed as notification of energy sharing system operation. The energy sharing history and a scenario function for setting and changing the rules for performing energy sharing are also provided. Service Center groups clusters into communities for management 

![キャプチャ](https://user-images.githubusercontent.com/71874910/102715154-b3370100-4316-11eb-9367-439522143789.PNG)

## Installation

Here is how to install apis-service_center individually.   
apis-ccc, apis-log and mongdb are required.

```bash
$ git clone https://github.com/hyphae/apis-service_center.git
$ cd apis-service_enter
$ sh venv.sh
$ sh initdb.sh
$ deactivate
```

## Running

Here is how to run apis-service_center individually.  

```bash
$ cd apis-service_center
$ sh start.sh
```
http://127.0.0.1:8000/static/ui_example/staff/visual.html  
account/password = admin/admin


## Stopping
Here is how to stop apis-service_center individually.  

```bash
$ cd apis-service_center
$ bash stop.sh
$ deactivate
```

<a id="anchor1"></a>
## Documentation
&emsp;[apis-service_center_specification(EN)](https://github.com/hyphae/apis-service_center/blob/main/doc/en/apis-service_center_specification_EN.md)  
&emsp;[apis-service_center_specification(JP)](https://github.com/hyphae/apis-service_center/blob/main/doc/jp/apis-service_center_specification_JP.md)

## License
&emsp;[Apache License Version 2.0](https://github.com/hyphae/apis-service_center/blob/main/LICENSE)


## Notice
&emsp;[Notice](https://github.com/hyphae/apis-service_center/blob/main/NOTICE.md)
