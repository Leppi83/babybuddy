// @ts-check
import { django } from "./helpers/db.js";

export default async function globalTeardown() {
  django(`
from django.contrib.auth.models import User
from core.models import Child, SleepTimer

child_qs = Child.objects.filter(first_name="E2E", last_name="Baby")
SleepTimer.objects.filter(child__in=child_qs).delete()
child_qs.delete()
User.objects.filter(username="e2e_user").delete()
print("cleanup done")
`);
  console.log("E2E teardown done");
}
