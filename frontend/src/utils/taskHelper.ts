export const canMarkInProgress = (
  user_id: string,
  issueStatus: string,
  object: any
): boolean => {
  // Check if status is "in progress"
  if (
    issueStatus === "in_progress" ||
    issueStatus === "resolved" ||
    issueStatus === "closed"
  ) {
    return false;
  }

  // Check if user_id exists in any escalation
  if (
    object?.escalations?.some(
      (escalation: any) =>
        escalation.escalated_by === user_id ||
        escalation.escalator?.user_id === user_id
    )
  ) {
    return false;
  }

  return true;
};

export const canResolve = (
  user_id: string,
  issueStatus: string,
  object: any
): boolean => {
  // Check if status is not "in progress"
  if (issueStatus !== "in_progress") {
    return false;
  }

  // Find the last "accepted" action in history
  const history = object?.history || [];

  // console.log("history:", history);

  // console.log("object:", object);
  // Filter only "accepted" actions and get the most recent one
  const acceptedActions = history
    .filter((item: any) => item.action === "accepted")
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  // console.log("acceptedActions:", acceptedActions);

  // If there are no accepted actions, return false
  if (acceptedActions.length === 0) {
    return false;
  }

  // Get the most recent accepted action
  const lastAccepted = acceptedActions[0];

  // Check if the user_id matches the user who last accepted the issue
  if (lastAccepted.user_id !== user_id) {
    return false;
  }

  // Check if user_id exists in any escalation
  if (
    object?.escalations?.some(
      (escalation: any) =>
        escalation.escalated_by === user_id ||
        escalation.escalator?.user_id === user_id
    )
  ) {
    // console.log("escalationobject: ", object?.escalations);
    return false;
  }

  return true;
};

export const canEscalate = (
  user_id: string,
  issueStatus: string,
  object: any
): boolean => {
  // Check if status is not "in progress"
  if (issueStatus !== "in_progress") {
    return false;
  }

  // console.log("esc object:", object);

  // Check if user_id exists in any escalation
  if (
    object?.escalations?.some(
      (escalation: any) =>
        escalation.escalated_by === user_id ||
        escalation.escalator?.user_id === user_id
    )
  ) {
    return false;
  }

  //  Filter only "accepted" actions and get the most recent one
  const history = object?.history || [];
  const acceptedActions = history
    .filter((item: any) => item.action === "accepted")
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  // console.log("acceptedActions:", acceptedActions);

  // If there are no accepted actions, return false
  if (acceptedActions.length === 0) {
    return false;
  }

  // Get the most recent accepted action
  const lastAccepted = acceptedActions[0];

  // Check if the user_id matches the user who last accepted the issue
  if (lastAccepted.user_id !== user_id) {
    return false;
  }

  // console.log("esc object?.escalations:", object?.escalations);
  return true;
};
// reporter

export const canConfirm = (
  user_id: string,
  issueStatus: string,
  object: any
): boolean => {
  // Check if status is not "in progress"
  if (issueStatus !== "resolved") {
    return false;
  }

  // console.log("esc object:", object);

  // Check if user_id exists in any escalation
  if (object?.reporter === user_id || object?.reporter?.user_id === user_id) {
    return true;
  }

  return false;
};

export const canReject = (
  user_id: string,
  issueStatus: string,
  object: any
): boolean => {
  // Check if status is not "in progress"
  if (issueStatus !== "resolved") {
    return false;
  }

  // console.log("esc object:", object);

  // Check if user_id exists in any escalation
  if (object?.reporter === user_id || object?.reporter?.user_id === user_id) {
    return true;
  }

  return false;
};

export const canReRaise = (
  user_id: string,
  issueStatus: string,
  object: any
): boolean => {
  // Check if status is not "in progress"
  if (issueStatus !== "closed") {
    return false;
  }

  // console.log("esc object:", object);

  // Check if user_id exists in any escalation
  if (object?.reporter === user_id || object?.reporter?.user_id === user_id) {
    return true;
  }

  return false;
};

// Internal Controllers
export const canAssign = (
  user_id: string,
  issueStatus: string,
  object: any
): boolean => {
  // Check if status is not "in progress"
  if (issueStatus === "resolved") {
    return false;
  }

  //  Filter only "accepted" actions and get the most recent one
  const history = object?.history || [];
  const acceptedActions = history
    .filter((item: any) => item.action === "accepted")
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  // console.log("acceptedActions:", acceptedActions);

  // If there are no accepted actions, return false
  if (acceptedActions.length === 0) {
    return false;
  }

  // Check if user_id exists in any accepted actions
  if (acceptedActions?.some((action: any) => action.user_id === user_id)) {
    return true;
  }

  // console.log("esc object?.escalations:", object?.escalations);
  return false;
};

export const canInternallyMarkInProgress = (
  user_id: string,
  issueStatus: string,
  object: any
): boolean => {
  // Check if status is "in progress"
  if (issueStatus === "in_progress" || issueStatus === "resolved") {
    return false;
  }

  //  Filter only "accepted" actions and get the most recent one
  const history = object?.history || [];
  const acceptedActions = history
    .filter((item: any) => item.action === "accepted")
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  // console.log("acceptedActions:", acceptedActions);

  // Check if user_id exists in any accepted actions
  if (acceptedActions?.some((action: any) => action.user_id === user_id)) {
    return false;
  }

  return true;
};

export const canInternallyResolve = (
  user_id: string,
  issueStatus: string,
  object: any
): boolean => {
  if (issueStatus === "resolved") {
    return false;
  }

  // Check if user_id exists in any assignment
  if (
    object?.assignments?.some(
      (assignment: any) => assignment.assigned_by === user_id
    )
  ) {
    return false;
  }

  //  Filter only "accepted" actions and get the most recent one
  const history = object?.history || [];
  const acceptedActions = history
    .filter((item: any) => item.action === "accepted")
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  // console.log("acceptedActions:", acceptedActions);

  // If there are no accepted actions, return false
  if (acceptedActions.length === 0) {
    return false;
  }
  // Check if user_id exists in any accepted actions
  if (acceptedActions?.some((action: any) => action.user_id === user_id)) {
    return true;
  }

  return false;
};
