from core import views as core_views


def crm_home(request):
    return core_views.crm_home(request)


def estates_api(request):
    return core_views.estates_api(request)

