export const CMS_MEDIA_COLUMNS = "id,title,alt_text,caption,media_type,role,storage_bucket,storage_path,external_url,mime_type,width,height,focal_x,focal_y";
export const CMS_ADMIN_MEDIA_COLUMNS = `${CMS_MEDIA_COLUMNS},is_active,created_at`;
export const CMS_PUBLIC_PAGE_COLUMNS = "id,page_key,title,seo_title,seo_description,og_media_id,published_at";
export const CMS_PUBLIC_SECTION_COLUMNS = "id,page_id,section_key,section_type,eyebrow,heading,body,cta_label,cta_href,desktop_media_id,mobile_media_id,sort_order,max_items";
export const CMS_PUBLIC_ITEM_COLUMNS = "id,section_id,item_key,item_type,title,body,label,href,media_id,room_type_id,physical_room_id,sort_order";
export const CMS_ADMIN_PAGE_COLUMNS = "id,page_key,status,title,seo_title,seo_description,og_media_id,published_at";
export const CMS_ADMIN_SECTION_COLUMNS = "id,page_id,section_key,section_type,eyebrow,heading,body,cta_label,cta_href,desktop_media_id,mobile_media_id,sort_order,is_enabled,max_items";
export const CMS_ADMIN_ITEM_COLUMNS = "id,section_id,item_key,item_type,title,body,label,href,media_id,room_type_id,physical_room_id,sort_order,is_enabled";
