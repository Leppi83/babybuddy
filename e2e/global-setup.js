// @ts-check
import { django } from "./helpers/db.js";
import datetime from "path"; // unused import trick to silence linters; datetime is used in Python

export default async function globalSetup() {
  const result = django(`
import datetime
from django.contrib.auth.models import User, Permission
from django.contrib.contenttypes.models import ContentType
from core.models import Child

u, _ = User.objects.get_or_create(username="e2e_user")
u.set_password("e2e_pass_123")
u.is_staff = True
u.is_active = True
u.save()

# Grant all core model permissions so the test user can use all features
from django.apps import apps
for model in apps.get_app_config("core").get_models():
    ct = ContentType.objects.get_for_model(model)
    for perm in Permission.objects.filter(content_type=ct):
        u.user_permissions.add(perm)

c, created = Child.objects.get_or_create(
    first_name="E2E",
    last_name="Baby",
    defaults={"birth_date": datetime.date(2024, 1, 1)},
)
print(f"user=e2e_user child_slug={c.slug} created={created}")
`);
  console.log("E2E setup:", result);
}
