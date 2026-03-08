import AccessControl "./authorization/access-control";

persistent actor {
  let accessControlState : AccessControl.AccessControlState = AccessControl.initState();
}
